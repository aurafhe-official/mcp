import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { AuraError, type Op, type Params } from './contracts.js'
import type { ClientCrypto } from './crypto/provider.js'
import type { Coprocessor } from './coprocessor.js'
import type { Journal } from './journal.js'
import { Vault, type VaultItem } from './vault.js'

export type Ctx = { crypto: ClientCrypto; remote: Coprocessor; vault: Vault; journal: Journal; home: string }

const round = (v: number, d = 6) => Math.round(v * 10 ** d) / 10 ** d

/** Plaintext semantics of each op; used ONLY locally for owner-side cross-checks. */
export function plainEval(op: Op, xs: number[], k?: number[]): number {
  switch (op) {
    case 'add': case 'sum': return xs.reduce((a, b) => a + b, 0)
    case 'sub': return xs[0] - xs[1]
    case 'mul': return xs.reduce((a, b) => a * b, 1)
    case 'scale': return xs[0] * (k?.[0] ?? 1)
    case 'weighted_sum': return xs.reduce((a, x, i) => a + x * (k?.[i] ?? 0), 0)
    case 'div': return xs[0] / xs[1]
    case 'compare': return xs[0] > xs[1] ? 1 : xs[0] < xs[1] ? -1 : 0
    case 'max': return Math.max(...xs)
  }
}

export async function sealValues(c: Ctx, label: string, values: number[]) {
  const items: VaultItem[] = []
  for (const v of values) items.push(await c.vault.put(c.crypto.encrypt(v), { label, kind: 'input' }))
  return items
}

/** Seal one numeric column of a local CSV. Values are read and encrypted on this machine only. */
export async function sealCsv(c: Ctx, file: string, column: string, label?: string) {
  const abs = path.resolve(file)
  const lines = (await readFile(abs, 'utf8')).split(/\r?\n/).filter(l => l.trim())
  const head = lines[0].split(',').map(h => h.trim())
  const idx = head.indexOf(column)
  if (idx < 0) throw new AuraError('COLUMN_NOT_FOUND', `Columns available: ${head.join(', ')}`)
  const values = lines.slice(1).map(l => Number(l.split(',')[idx]))
  if (values.some(v => !Number.isFinite(v))) throw new AuraError('NON_NUMERIC_COLUMN')
  const items = await sealValues(c, label ?? `${path.basename(abs)}:${column}`, values)
  return { label: items[0]?.label, rows: items.length, handles: items.map(i => i.handle) }
}

export async function compute(c: Ctx, op: Op, handles: string[], constants?: number[]) {
  const health = await c.remote.health()
  if (!health.ops.includes(op)) throw new AuraError('OPERATION_UNAVAILABLE', `This coprocessor supports: ${health.ops.join(', ')}`)
  if (['sub', 'div', 'compare'].includes(op) && handles.length !== 2) throw new AuraError('EXACTLY_TWO_HANDLES')
  if (op === 'scale' && (handles.length !== 1 || constants?.length !== 1)) throw new AuraError('SCALE_NEEDS_ONE_HANDLE_ONE_CONSTANT')
  if (op === 'weighted_sum' && constants?.length !== handles.length) throw new AuraError('ONE_WEIGHT_PER_HANDLE')
  if (!['scale', 'weighted_sum'].includes(op) && handles.length < 2) throw new AuraError('AT_LEAST_TWO_HANDLES')
  const cts = await Promise.all(handles.map(h => c.vault.get(h)))
  const session = await c.remote.ensureSession(c.crypto.fingerprint(), c.crypto.evaluationKeys())
  const t = Date.now()
  const r = await c.remote.evaluate(session, op, cts.map(x => x.ciphertext), constants)
  const label = `${op}(${[...new Set(cts.map(x => x.item.label))].join(',')})`
  const item = await c.vault.put(r.result, { label, kind: 'result', op, from: handles, plain: constants, engineMs: r.engineMs })
  return { handle: item.handle, label, op, inputs: handles.length, engineMs: round(r.engineMs, 1), roundTripMs: Date.now() - t,
    ciphertextBytes: item.bytes, note: 'Result is still encrypted. Use aura_reveal to decrypt locally.' }
}

/** Recompute a result from its decrypted leaves, entirely on this machine. */
async function recompute(c: Ctx, handle: string): Promise<number> {
  const { item, ciphertext } = await c.vault.get(handle)
  if (item.kind === 'input') return c.crypto.decrypt(ciphertext)
  const xs = await Promise.all(item.from!.map(h => recompute(c, h)))
  return plainEval(item.op!, xs, item.plain)
}

export async function reveal(c: Ctx, handle: string, allowRawInput = false) {
  const { item, ciphertext } = await c.vault.get(handle)
  if (item.kind === 'input' && !allowRawInput)
    throw new AuraError('RAW_INPUT_REVEAL_BLOCKED', 'Sealed source records are never revealed to the agent. Reveal only computed results.')
  const value = c.crypto.decrypt(ciphertext)
  const expected = await recompute(c, handle)
  const error = Math.abs(value - expected)
  return { handle, label: item.label, value: round(value), decryptedWhere: 'this machine (local secret key)',
    crossCheck: { plaintextRecomputedLocally: round(expected), absoluteError: error, pass: error <= 1e-4 * Math.max(1, Math.abs(expected)) } }
}

export type { Params }
