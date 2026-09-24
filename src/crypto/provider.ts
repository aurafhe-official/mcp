import type { Params } from '../contracts.js'

/**
 * Owner-side cryptography. Runs only on the user's machine.
 * The secret key is created, stored and used here and is never serialized
 * into any network payload. Swap the reference implementation for Aura's
 * client library by implementing this interface; nothing else changes.
 */
export interface ClientCrypto {
  readonly name: string
  readonly params: Params
  /** SHA-256 of the public key material. Safe to display. */
  fingerprint(): string
  /** Evaluation keys the coprocessor needs (relinearization etc). Public by construction. */
  evaluationKeys(): { relin: string }
  encrypt(value: number): string
  decrypt(ciphertext: string): number
  /** Raw secret key bytes, used ONLY by the audit to prove they never left this machine. */
  secretKeyProbe(): string
}

export interface ClientCryptoFactory {
  create(params: Params, keyDir: string): Promise<ClientCrypto>
}
