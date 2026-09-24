import SEAL from 'node-seal'
import type { Params } from '../contracts.js'

export type Seal = Awaited<ReturnType<typeof SEAL>>
let runtime: Promise<Seal> | undefined
export const seal = () => (runtime ??= SEAL())

export async function context(params: Params) {
  const s = await seal()
  const p = new s.EncryptionParameters(s.SchemeType.ckks)
  p.setPolyModulusDegree(params.polyModulusDegree)
  p.setCoeffModulus(s.CoeffModulus.Create(params.polyModulusDegree, Int32Array.from(params.coeffModulusBits)))
  const ctx = new s.SEALContext(p, true, s.SecLevelType.tc128)
  if (!ctx.parametersSet()) throw new Error('INVALID_PARAMETERS')
  return { s, ctx, scale: 2 ** params.scaleBits }
}
