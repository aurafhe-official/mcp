import { createHash } from 'node:crypto'
import { ephemeralDecryptor } from './crypto/seal-ckks.js'
import type { Ctx } from './session.js'

type Check = { id: string; claim: string; pass: boolean; evidence: Record<string, unknown> }
const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16)

/**
 * Live proof suite. Every check runs on real ciphertext against the real coprocessor.
 * Nothing here is mocked; a failing check is reported as a failure.
 */
export async function runProof(c: Ctx, opts: { secret?: number } = {}) {
  const checks: Check[] = []
  const health = await c.remote.health()
  const session = await c.remote.ensureSession(c.crypto.fingerprint(), c.crypto.evaluationKeys())

  // 1. Key custody
  checks.push({ id: 'key-custody', claim: 'The coprocessor declares no secret key; this is metadata, not proof of key custody.',
    pass: health.secretKeyLoaded === false,
    evidence: { serverSecretKeyLoaded: health.secretKeyLoaded, localKeyFingerprint: c.crypto.fingerprint().slice(0, 16), keyFilePermissionsVerified: false } })

  // 2. Probabilistic encryption: same number, different ciphertext
  const a = c.crypto.encrypt(42), b = c.crypto.encrypt(42)
  checks.push({ id: 'semantic-security', claim: 'Two encryptions of the same example differ; this observation alone does not prove semantic security.',
    pass: a !== b, evidence: { first: sha(a), second: sha(b), ciphertextBytes: Buffer.byteLength(a), plaintextBytes: 8 } })

  // 3. Real compute on ciphertext, chosen by the viewer if provided
  const x = opts.secret ?? Math.round(Math.random() * 1_000_000) / 100
  const y = 17.25
  const t0 = Date.now()
  const sum = await c.remote.evaluate(session, 'add', [c.crypto.encrypt(x), c.crypto.encrypt(y)])
  const prod = await c.remote.evaluate(session, 'mul', [c.crypto.encrypt(x), c.crypto.encrypt(y)])
  const gotSum = c.crypto.decrypt(sum.result), gotProd = c.crypto.decrypt(prod.result)
  const errSum = Math.abs(gotSum - (x + y)), errProd = Math.abs(gotProd - x * y)
  checks.push({ id: 'correct-under-encryption', claim: 'The server returned encrypted results that decrypt locally to the right answer.',
    pass: errSum < 1e-4 * Math.max(1, x) && errProd < 1e-4 * Math.max(1, x * y),
    evidence: { input: opts.secret !== undefined ? 'viewer-chosen (not shown)' : x, add: { expected: x + y, decrypted: gotSum, absError: errSum },
      mul: { expected: x * y, decrypted: gotProd, absError: errProd }, engineMs: sum.engineMs + prod.engineMs, roundTripMs: Date.now() - t0 } })

  // 4. Wrong key produces garbage
  const wrong = await ephemeralDecryptor(c.crypto.params)
  let wrongValue: number | string
  try { wrongValue = wrong(sum.result) } catch { wrongValue = 'decryption failed' }
  checks.push({ id: 'wrong-key', claim: 'This sampled result does not decrypt correctly with one unrelated test key.',
    pass: typeof wrongValue !== 'number' || !Number.isFinite(wrongValue) || Math.abs(wrongValue - (x + y)) > 1,
    evidence: { correctKey: Math.round(gotSum * 1e4) / 1e4, otherKey: wrongValue } })

  // 5. Server cannot decrypt
  const challenge = await c.remote.challengeDecrypt(sum.result)
  checks.push({ id: 'server-blind', claim: 'The tested /decrypt route returned 404; this does not establish absence of other decryption paths.',
    pass: challenge === 'REFUSED_NO_CAPABILITY', evidence: { serverResponse: challenge } })

  // 6. Journal: secret key bytes never left this machine
  const leaked = c.journal.containsInOutbound(c.crypto.secretKeyProbe())
  const entries = c.journal.session()
  checks.push({ id: 'no-key-egress', claim: 'Two secret-key fragments were not found in the retained request-body sample; this is not a complete egress audit.',
    pass: !leaked, evidence: { requestsInspected: entries.length, bytesSent: entries.reduce((n, e) => n + e.bytesOut, 0),
      payloadKinds: [...new Set(entries.flatMap(e => e.kinds))] } })

  // 7. Chained computation: error stays bounded
  let acc = c.crypto.encrypt(0), expected = 0
  const steps = 50
  for (let i = 1; i <= steps; i++) {
    const v = i * 1.5
    acc = (await c.remote.evaluate(session, 'add', [acc, c.crypto.encrypt(v)])).result
    expected += v
  }
  acc = (await c.remote.evaluate(session, 'scale', [acc], [0.1])).result; expected *= 0.1
  const chained = c.crypto.decrypt(acc), chainErr = Math.abs(chained - expected)
  checks.push({ id: 'chained-error', claim: `${steps + 1} sampled operations meet the stated error threshold; this does not establish arbitrary circuit depth.`,
    pass: chainErr < 1e-3, evidence: { steps: steps + 1, expected, decrypted: chained, absError: chainErr } })

  return { scope: 'Reference functional observations, not security certification or an Aura engine benchmark.', productionReady: false,
    engine: health.engine, scheme: health.scheme, endpoint: c.remote.endpoint, client: c.crypto.name,
    passed: checks.filter(k => k.pass).length, total: checks.length, checks }
}
