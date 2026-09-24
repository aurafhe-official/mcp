import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Params } from '../contracts.js'
import type { ClientCrypto, ClientCryptoFactory } from './provider.js'
import { context } from './seal-context.js'

/**
 * Reference owner-side crypto: CKKS (Microsoft SEAL via node-seal), 128-bit.
 * Conformance harness for the wire protocol. Production swaps in Aura's client
 * library behind the same ClientCrypto interface.
 */
export const SealCkksFactory: ClientCryptoFactory = {
  async create(params: Params, keyDir: string): Promise<ClientCrypto> {
    const { s, ctx, scale } = await context(params)
    const Z = s.ComprModeType.zstd
    await mkdir(keyDir, { recursive: true, mode: 0o700 })
    const skFile = path.join(keyDir, 'secret.key'), pkFile = path.join(keyDir, 'public.key'), rkFile = path.join(keyDir, 'relin.key')
    let kg
    if (existsSync(skFile)) {
      const sk = new s.SecretKey(); sk.loadFromBase64(ctx, await readFile(skFile, 'utf8'))
      kg = new s.KeyGenerator(ctx, sk)
    } else {
      kg = new s.KeyGenerator(ctx)
      await writeFile(skFile, kg.secretKey().saveToBase64(Z), { mode: 0o600 }); await chmod(skFile, 0o600)
      await writeFile(pkFile, kg.createPublicKey().saveToBase64(Z), { mode: 0o644 })
      await writeFile(rkFile, kg.createRelinKeysSerializable().saveToBase64(Z), { mode: 0o644 })
    }
    const sk = kg.secretKey()
    const pk = existsSync(pkFile) ? await readFile(pkFile, 'utf8') : kg.createPublicKey().saveToBase64(Z)
    const relin = existsSync(rkFile) ? await readFile(rkFile, 'utf8') : kg.createRelinKeysSerializable().saveToBase64(Z)
    const skB64 = sk.saveToBase64(Z)
    const encoder = new s.CKKSEncoder(ctx)
    const encryptor = new s.Encryptor(ctx, kg.createPublicKey(), sk)
    const decryptor = new s.Decryptor(ctx, sk)
    const fp = createHash('sha256').update(pk).digest('hex')
    return {
      name: 'reference-ckks (Microsoft SEAL, 128-bit)',
      params,
      fingerprint: () => fp,
      evaluationKeys: () => ({ relin }),
      encrypt(value) {
        if (!Number.isFinite(value)) throw new Error('NON_FINITE_INPUT')
        const pt = new s.Plaintext(); encoder.encode(Float64Array.from([value]), scale, pt)
        // Seeded symmetric encryption with the owner's secret key: fresh randomness every call.
        const out = encryptor.encryptSymmetricSerializable(pt).saveToBase64(Z)
        pt.delete(); return out
      },
      decrypt(b64) {
        const ct = new s.Ciphertext(); ct.loadFromBase64(ctx, b64)
        const pt = new s.Plaintext(); decryptor.decrypt(ct, pt)
        const v = encoder.decodeFloat64(pt)[0] as number
        ct.delete(); pt.delete(); return v
      },
      secretKeyProbe: () => skB64,
    }
  },
}

/** A throwaway key pair, used by the wrong-key test. Never persisted. */
export async function ephemeralDecryptor(params: Params) {
  const { s, ctx } = await context(params)
  const kg = new s.KeyGenerator(ctx)
  const encoder = new s.CKKSEncoder(ctx), decryptor = new s.Decryptor(ctx, kg.secretKey())
  return (b64: string) => {
    const ct = new s.Ciphertext(); ct.loadFromBase64(ctx, b64)
    const pt = new s.Plaintext(); decryptor.decrypt(ct, pt)
    return encoder.decodeFloat64(pt)[0] as number
  }
}
