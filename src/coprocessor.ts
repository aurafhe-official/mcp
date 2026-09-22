import { randomUUID } from 'node:crypto'
import * as z from 'zod/v4'
import { AuraError, KeyRef, MAX_RESPONSE, PROTOCOL } from './contracts.js'

export type Action = 'session.open' | 'session.status' | 'dataset.import' | 'compute' | 'result.export' | 'objects.release'
export interface Coprocessor {
  request(action: Action, payload: object, signal?: AbortSignal): Promise<unknown>
}
export type Options = { endpoint: string; token: string; timeoutMs?: number; fetch?: typeof fetch }

/** Public transport only. No engine bindings, key files, encryption or native dispatch. */
export class HttpsCoprocessor implements Coprocessor {
  private endpoint: URL
  private fetchImpl: typeof fetch
  private timeoutMs: number
  constructor(private options: Options) {
    this.endpoint = new URL(options.endpoint)
    if (this.endpoint.protocol !== 'https:' || this.endpoint.username || this.endpoint.password || this.endpoint.search || this.endpoint.hash) throw new AuraError('INVALID_HTTPS_ENDPOINT')
    if (!/^[\x21-\x7e]{16,4096}$/.test(options.token)) throw new AuraError('INVALID_SERVICE_CREDENTIAL')
    this.timeoutMs = options.timeoutMs ?? 30_000
    if (!Number.isInteger(this.timeoutMs) || this.timeoutMs < 1000 || this.timeoutMs > 120_000) throw new AuraError('INVALID_TIMEOUT')
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new AuraError('TLS_VERIFICATION_REQUIRED')
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis)
  }
  async request(action: Action, payload: object, signal?: AbortSignal): Promise<unknown> {
    if (signal?.aborted) throw new AuraError('CANCELLED')
    const requestId = randomUUID()
    const controller = new AbortController()
    let timedOut = false
    const cancel = () => controller.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(() => { timedOut = true; controller.abort() }, this.timeoutMs)
    let response: Response | undefined
    try {
      response = await this.fetchImpl(this.endpoint, { method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'authorization': `Bearer ${this.options.token}`, 'content-type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({ protocol: PROTOCOL, requestId, action, payload }) })
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
      const envelope = z.strictObject({ protocol: z.literal(PROTOCOL), requestId: z.literal(requestId), result: z.unknown() })
        .parse(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      if (controller.signal.aborted) throw new AuraError(signal?.aborted ? 'CANCELLED' : 'COPROCESSOR_TIMEOUT')
      return envelope.result
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
}

export function configuredCoprocessor() {
  if (process.env.AURA_NATIVE_LIBRARY || process.env.AURA_WORKSPACE || process.env.AFHE_API_URL || process.env.AFHE_INSECURE_TLS) throw new AuraError('LEGACY_CONFIGURATION_UNSUPPORTED')
  const endpoint = process.env.AURA_COPROCESSOR_URL
  const token = process.env.AURA_ACCESS_TOKEN
  if (!endpoint || !token) throw new AuraError('COPROCESSOR_CONFIGURATION_REQUIRED')
  const key = KeyRef.parse({ id: process.env.AURA_KEY_ID, version: Number(process.env.AURA_KEY_VERSION) })
  return { coprocessor: new HttpsCoprocessor({ endpoint, token }), key }
}
