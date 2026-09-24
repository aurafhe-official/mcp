import * as z from 'zod/v4'

export const VERSION = '0.6.0-reference.0'
export const PROTOCOL = 'aura-coprocessor/1'
export const DEFAULT_ENDPOINT = 'http://127.0.0.1:8787'
export const MAX_CIPHERTEXT = 8 * 1024 * 1024
export const MAX_KEYS = 64 * 1024 * 1024
export const MAX_ARGS = 64

export class AuraError extends Error {
  constructor(public readonly code: string, public readonly hint?: string) { super(code) }
}

/** Operations a coprocessor may advertise. The reference engine ships the first six. */
export const Op = z.enum(['add', 'sub', 'mul', 'sum', 'scale', 'weighted_sum', 'div', 'compare', 'max'])
export type Op = z.infer<typeof Op>
export const REFERENCE_OPS: Op[] = ['add', 'sub', 'mul', 'sum', 'scale', 'weighted_sum']

export const Ciphertext = z.string().min(16).max(MAX_CIPHERTEXT)

/** What the coprocessor must report. secretKeyLoaded must be false for any user session. */
export const Health = z.object({
  status: z.literal('ok'),
  protocol: z.literal(PROTOCOL),
  role: z.literal('compute'),
  secretKeyLoaded: z.literal(false),
  engine: z.string().max(128),
  scheme: z.string().max(64),
  ops: z.array(Op),
})
export type Health = z.infer<typeof Health>

export const SessionResponse = z.object({ sessionId: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/) })
export const EvalResponse = z.object({
  result: Ciphertext,
  engineMs: z.number().nonnegative(),
  level: z.number().int().nonnegative().optional(),
})

/** Public encryption parameters. Clients pin these and refuse anything weaker than 128-bit. */
export const Params = z.object({
  scheme: z.literal('ckks'),
  polyModulusDegree: z.number().int(),
  coeffModulusBits: z.array(z.number().int()),
  scaleBits: z.number().int(),
  securityLevel: z.literal(128),
})
export type Params = z.infer<typeof Params>

export const DEFAULT_PARAMS: Params = {
  scheme: 'ckks', polyModulusDegree: 8192, coeffModulusBits: [60, 40, 40, 60], scaleBits: 40, securityLevel: 128,
}
