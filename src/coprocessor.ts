import * as z from 'zod/v4'
import { AuraError, EvalResponse, Health, Params, SessionResponse, type Op } from './contracts.js'
import type { Journal } from './journal.js'

export type CoprocessorOptions = { endpoint: string; token?: string; timeoutMs?: number; journal: Journal }

/**
 * Transport to the coprocessor. HTTPS only, except http://localhost / 127.0.0.1
 * for the local reference engine. Completed responses are journaled after sending; see REVIEW.md for coverage limits.
 */
export class Coprocessor {
  private url: URL
  private session?: { id: string; fingerprint: string }
  constructor(private o: CoprocessorOptions) {
    this.url = new URL(o.endpoint)
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(this.url.hostname)
    if (this.url.protocol !== 'https:' && !(local && this.url.protocol === 'http:')) throw new AuraError('HTTPS_REQUIRED', 'Use https:// (http is allowed only for localhost).')
    if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new AuraError('TLS_VERIFICATION_REQUIRED')
  }
  get endpoint() { return this.url.origin }

  private async request<T>(method: 'GET' | 'POST', path: string, schema: z.ZodType<T>, body?: object, kinds: string[] = []): Promise<T> {
    const payload = body ? JSON.stringify(body) : ''
    const started = Date.now()
    const res = await fetch(new URL(path, this.url), {
      method, redirect: 'error', signal: AbortSignal.timeout(this.o.timeoutMs ?? 120_000),
      headers: { accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}),
        ...(this.o.token ? { authorization: `Bearer ${this.o.token}` } : {}) },
      body: body ? payload : undefined,
    }).catch(() => { throw new AuraError('COPROCESSOR_UNREACHABLE', `Could not reach ${this.url.origin}. Check network or AURA_COPROCESSOR_URL.`) })
    const text = await res.text()
    await this.o.journal.record({ method, path, bytesOut: Buffer.byteLength(payload), bytesIn: Buffer.byteLength(text), kinds, status: res.status, ms: Date.now() - started }, payload)
    if (res.status === 404) throw new AuraError('NOT_SUPPORTED_BY_COPROCESSOR')
    if (res.status === 401 || res.status === 403) throw new AuraError('COPROCESSOR_ACCESS_DENIED', 'Set AURA_ACCESS_TOKEN.')
    if (!res.ok) throw new AuraError('COPROCESSOR_ERROR', text.slice(0, 200))
    return schema.parse(JSON.parse(text))
  }

  health() { return this.request('GET', '/health', Health) }
  params() { return this.request('GET', '/params', Params) }

  /** Registers PUBLIC evaluation keys once per key fingerprint. The secret key is not a parameter. */
  async ensureSession(fingerprint: string, evalKeys: { relin: string }) {
    if (this.session?.fingerprint === fingerprint) return this.session.id
    const r = await this.request('POST', '/session', SessionResponse, { fingerprint, evaluationKeys: evalKeys }, ['evaluation-keys(public)'])
    this.session = { id: r.sessionId, fingerprint }
    return r.sessionId
  }

  evaluate(sessionId: string, op: Op, args: string[], plain?: number[]) {
    return this.request('POST', '/eval', EvalResponse, { sessionId, op, args, ...(plain ? { plain } : {}) },
      [`ciphertext x${args.length}`, ...(plain ? [`public-constants x${plain.length}`] : [])])
  }

  /** Blindness challenge: ask the server to decrypt. A compliant coprocessor has no way to. */
  async challengeDecrypt(ciphertext: string) {
    try { await this.request('POST', '/decrypt', z.any(), { ciphertext }, ['ciphertext x1 (decrypt challenge)']); return 'SERVER_RETURNED_SOMETHING' as const }
    catch (e) { return e instanceof AuraError && e.code === 'NOT_SUPPORTED_BY_COPROCESSOR' ? 'REFUSED_NO_CAPABILITY' as const : 'INCONCLUSIVE' as const }
  }
}
