import * as z from 'zod/v4'
import { AuraError, Ciphertext, DEFAULT_ENDPOINT, FUNCTIONS, FunctionList, MAX_RESPONSE } from './contracts.js'

export const Health = z.object({ status: z.literal('ok'), role: z.string().optional(),
  secretKeyLoaded: z.boolean().optional(), keyId: z.string().min(1).max(128).optional() })
export interface Coprocessor {
  health(signal?: AbortSignal): Promise<z.infer<typeof Health>>
  functions(signal?: AbortSignal): Promise<z.infer<typeof FunctionList>>
  call(fn: string, ciphertexts: string[], signal?: AbortSignal): Promise<string>
}
export type Options = { endpoint?: string; token?: string; timeoutMs?: number; fetch?: typeof fetch }

/** Verified HTTPS transport; no backend diagnostics are returned to the model. */
export class HttpsCoprocessor implements Coprocessor {
  private endpoint: URL
  private fetchImpl: typeof fetch
  private timeoutMs: number
  constructor(private options: Options = {}) {
    this.endpoint = new URL(options.endpoint ?? DEFAULT_ENDPOINT)
    if (this.endpoint.protocol !== 'https:' || this.endpoint.username || this.endpoint.password || this.endpoint.search || this.endpoint.hash || this.endpoint.pathname !== '/') throw new AuraError('INVALID_HTTPS_ENDPOINT')
    if (options.token !== undefined && !/^[\x21-\x7e]{16,4096}$/.test(options.token)) throw new AuraError('INVALID_SERVICE_CREDENTIAL')
    this.timeoutMs = options.timeoutMs ?? 30_000
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1000 || this.timeoutMs > 120_000) throw new AuraError('INVALID_TIMEOUT')
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new AuraError('TLS_VERIFICATION_REQUIRED')
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)
  }
  private async request(path: string, body?: object, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) throw new AuraError('CANCELLED')
    const controller = new AbortController()
    let timedOut = false
    const cancel = () => controller.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, this.timeoutMs)
    let response: Response | undefined
    try {
      response = await this.fetchImpl(new URL(path, this.endpoint), { method: body ? 'POST' : 'GET', redirect: 'error', signal: controller.signal,
        headers: { ...(this.options.token ? { authorization: `Bearer ${this.options.token}` } : {}),
          ...(body ? { 'content-type': 'application/json' } : {}), accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined })
      if (response.status === 401 || response.status === 403) throw new AuraError('COPROCESSOR_ACCESS_DENIED')
      if (response.status === 429) throw new AuraError('COPROCESSOR_RATE_LIMIT')
      if (!response.ok) throw new AuraError('COPROCESSOR_UNAVAILABLE')
      if (!response.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new AuraError('INVALID_COPROCESSOR_RESPONSE')
      if (Number(response.headers.get('content-length')) > MAX_RESPONSE || !response.body) throw new AuraError('INVALID_COPROCESSOR_RESPONSE')
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let length = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          length += value.byteLength
          if (length > MAX_RESPONSE) throw new AuraError('COPROCESSOR_RESPONSE_LIMIT')
          chunks.push(value)
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
      if (controller.signal.aborted) throw new AuraError(signal?.aborted ? 'CANCELLED' : 'COPROCESSOR_TIMEOUT')
      return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch (e) {
      if (signal?.aborted) throw new AuraError('CANCELLED')
      if (timedOut) throw new AuraError('COPROCESSOR_TIMEOUT')
      if (e instanceof AuraError) throw e
      // Do not echo server bodies, URLs, credentials or native diagnostics.
      throw new AuraError('COPROCESSOR_CONNECTION_OR_PROTOCOL_FAILED')
    } finally {
      await response?.body?.cancel().catch(() => {})
      clearTimeout(timer)
      signal?.removeEventListener('abort', cancel)
    }
  }
  async health(signal?: AbortSignal) { return Health.parse(await this.request('/health', undefined, signal)) }
  async functions(signal?: AbortSignal) { return FunctionList.parse(await this.request('/functions', undefined, signal)) }
  async call(fn: string, ciphertexts: string[], signal?: AbortSignal) {
    const allowed: string[] = Object.values(FUNCTIONS).flatMap(value => Object.values(value))
    if (!allowed.includes(fn) || ciphertexts.length !== 2) throw new AuraError('INVALID_OPERATION')
    ciphertexts.forEach(value => Ciphertext.parse(value))
    return z.strictObject({ result: Ciphertext }).parse(await this.request('/call', { fn, args: ciphertexts }, signal)).result
  }
  /** Fixed public numbers only; no caller-supplied plaintext enters this method. */
  async demoBundle(signal?: AbortSignal) {
    const inputs = []
    for (const [domain, value] of [['int','25'], ['int','17'], ['float','7.5'], ['float','2.5'], ['float','2']] as const) {
      const result = z.strictObject({ ciphertext: Ciphertext }).parse(await this.request(`/encrypt/${domain}`, { value, public: true }, signal))
      inputs.push({ domain, ciphertext: result.ciphertext })
    }
    return { version: 1 as const, keyId: 'public-synthetic-demo', inputs }
  }
}

export function configuredCoprocessor(env: NodeJS.ProcessEnv = process.env) {
  if (env.AURA_NATIVE_LIBRARY || env.AURA_WORKSPACE || env.AFHE_INSECURE_TLS || env.AFHE_API_URL || env.AFHE_INPUT_BUNDLE || env.AURA_KEY_ID || env.AURA_KEY_VERSION) throw new AuraError('LEGACY_CONFIGURATION_UNSUPPORTED')
  return new HttpsCoprocessor({ endpoint: env.AURA_COPROCESSOR_URL, token: env.AURA_ACCESS_TOKEN })
}
