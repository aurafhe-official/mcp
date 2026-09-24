import { context } from '../crypto/seal-context.js'
import type { Op, Params } from '../contracts.js'

/**
 * Reference evaluator. Holds ONLY public evaluation keys. There is no code path
 * here that can create, load or accept a secret key.
 */
export async function createEngine(params: Params) {
  const { s, ctx, scale } = await context(params)
  const Z = s.ComprModeType.zstd
  const ev = new s.Evaluator(ctx), enc = new s.CKKSEncoder(ctx)
  const load = (b64: string) => { const c = new s.Ciphertext(); c.loadFromBase64(ctx, b64); return c }
  type CT = ReturnType<typeof load>
  const level = (c: CT) => ctx.getContextData(c.parmsId()).chainIndex()

  const align = (cs: CT[]) => {
    const min = Math.min(...cs.map(level))
    for (const c of cs) { while (level(c) > min) ev.cipherModSwitchToNextInplace(c); c.setScale(scale) }
  }
  const mulPlain = (c: CT, k: number) => {
    const pt = new s.Plaintext(); enc.encode(Float64Array.from([k]), scale, pt)
    ev.plainModSwitchToInplace(pt, c.parmsId())
    ev.multiplyPlainInplace(c, pt); ev.rescaleToNextInplace(c); c.setScale(scale); pt.delete()
  }
  const addAll = (cs: CT[]) => { align(cs); const out = cs[0]; for (const c of cs.slice(1)) ev.addInplace(out, c); return out }

  const loadRelin = (b64: string) => { const rk = new s.RelinKeys(); rk.loadFromBase64(ctx, b64); return rk }
  return {
    loadRelin,
    evaluate(op: Op, args: string[], rk: ReturnType<typeof loadRelin>, plain?: number[]) {
      const cs = args.map(load)
      let out: CT
      switch (op) {
        case 'add': case 'sum': out = addAll(cs); break
        case 'sub': align(cs); out = cs[0]; ev.subInplace(out, cs[1]); break
        case 'mul':
          out = cs[0]
          for (const c of cs.slice(1)) { align([out, c]); ev.multiplyInplace(out, c); ev.relinearizeInplace(out, rk); ev.rescaleToNextInplace(out); out.setScale(scale) }
          break
        case 'scale': out = cs[0]; mulPlain(out, plain![0]); break
        case 'weighted_sum': cs.forEach((c, i) => mulPlain(c, plain![i])); out = addAll(cs); break
        default: throw new Error('OPERATION_UNAVAILABLE')
      }
      const result = out.saveToBase64(Z), lvl = level(out)
      cs.forEach(c => { if (!c.isDeleted()) c.delete() })
      return { result, level: lvl }
    },
  }
}
