#!/usr/bin/env node
import http from 'node:http'
import { randomBytes } from 'node:crypto'
import { DEFAULT_PARAMS, MAX_ARGS, MAX_KEYS, Op, PROTOCOL, REFERENCE_OPS, type Health } from '../contracts.js'
import { createEngine } from './engine.js'

/**
 * Reference coprocessor implementing aura-coprocessor/1.
 * Conformance target for Aura's production coprocessor: same endpoints,
 * same guarantees, different engine. Runs locally for development and CI.
 */
const port = Number(process.env.PORT ?? 8787)
const params = DEFAULT_PARAMS
const engine = await createEngine(params)
const sessions = new Map<string, { rk: ReturnType<typeof engine.loadRelin>; created: number }>()

const health: Health = { status: 'ok', protocol: PROTOCOL, role: 'compute', secretKeyLoaded: false,
  engine: 'aura-reference (Microsoft SEAL CKKS)', scheme: 'ckks-128', ops: REFERENCE_OPS }

const send = (res: http.ServerResponse, code: number, body: object) => {
  res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body))
}
const readBody = (req: http.IncomingMessage) => new Promise<string>((ok, fail) => {
  let n = 0; const chunks: Buffer[] = []
  req.on('data', (c: Buffer) => { n += c.length; if (n > MAX_KEYS) { fail(new Error('TOO_LARGE')); req.destroy() } else chunks.push(c) })
  req.on('end', () => ok(Buffer.concat(chunks).toString('utf8'))); req.on('error', fail)
})
const log = (msg: string) => process.stderr.write(`[coprocessor] ${new Date().toISOString()} ${msg}\n`)

http.createServer(async (req, res) => {
  try {
    const route = `${req.method} ${req.url}`
    if (route === 'GET /health') return send(res, 200, health)
    if (route === 'GET /params') return send(res, 200, params)
    if (route === 'POST /session') {
      const body = JSON.parse(await readBody(req))
      const rk = engine.loadRelin(String(body.evaluationKeys?.relin))
      const id = randomBytes(18).toString('base64url')
      sessions.set(id, { rk, created: Date.now() })
      log(`session ${id.slice(0, 8)} registered, public relin key ${String(body.evaluationKeys.relin).length} bytes, no secret key`)
      return send(res, 200, { sessionId: id })
    }
    if (route === 'POST /eval') {
      const body = JSON.parse(await readBody(req))
      const sess = sessions.get(body.sessionId)
      if (!sess) return send(res, 401, { error: 'UNKNOWN_SESSION' })
      const op = Op.parse(body.op)
      if (!REFERENCE_OPS.includes(op)) return send(res, 422, { error: 'OPERATION_UNAVAILABLE' })
      if (!Array.isArray(body.args) || body.args.length < 1 || body.args.length > MAX_ARGS) return send(res, 400, { error: 'BAD_ARGS' })
      const t = performance.now()
      const out = engine.evaluate(op, body.args, sess.rk, body.plain)
      const engineMs = performance.now() - t
      log(`eval ${op} over ${body.args.length} ciphertexts (${body.args.reduce((n: number, a: string) => n + a.length, 0)} bytes) in ${engineMs.toFixed(1)}ms, saw no plaintext`)
      return send(res, 200, { result: out.result, engineMs, level: out.level })
    }
    // Deliberately absent: /encrypt, /decrypt, /keys/secret. This server cannot see plaintext.
    return send(res, 404, { error: 'NOT_FOUND' })
  } catch (e) { return send(res, 400, { error: 'BAD_REQUEST' }) }
}).listen(port, '127.0.0.1', () => log(`reference coprocessor on http://127.0.0.1:${port} (${health.engine}); holds no secret key`))
