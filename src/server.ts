import { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { AuraError, Op, VERSION } from './contracts.js'
import { compute, reveal, sealCsv, sealValues, type Ctx } from './session.js'
import { runProof } from './proof.js'

const ok = (v: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(v, null, 1) }] })
async function safe(fn: () => Promise<unknown>) {
  try { return ok(await fn()) }
  catch (e) {
    const err = e instanceof AuraError ? { error: e.code, hint: e.hint } : { error: 'FAILED', detail: String((e as Error)?.message ?? e).slice(0, 200) }
    return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(err) }] }
  }
}

export function createServer(c: Ctx) {
  const server = new McpServer({ name: 'aura', version: VERSION, title: 'AURA encrypted compute' }, {
    instructions: [
      'This is an unpublished Microsoft SEAL reference harness for synthetic development data, not Aura engine performance or production security assurance;',
      'The selected coprocessor computes on ciphertext; computed results can be decrypted locally and returned to the agent.',
      'Workflow: aura_status -> aura_list (or aura_seal_csv / aura_seal_values) -> aura_compute -> aura_reveal.',
      'Never ask the user for the raw values behind sealed data. Raw sealed inputs cannot be revealed, only computed results.',
      'Call aura_proof for sampled functional checks with limitations, and aura_journal for partial request metadata. Neither certifies confidentiality.',
    ].join(' '),
  })

  server.registerTool('aura_status', { title: 'Status', description: 'Coprocessor health, engine, supported operations, and the local key fingerprint. Reports the server declaration; does not establish key custody.',
    inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } },
    async () => safe(async () => {
      const h = await c.remote.health()
      return { endpoint: c.remote.endpoint, engine: h.engine, scheme: h.scheme, ops: h.ops, serverHoldsSecretKey: h.secretKeyLoaded,
        client: c.crypto.name, localKeyFingerprint: c.crypto.fingerprint().slice(0, 16), sealedItems: (await c.vault.list()).length }
    }))

  server.registerTool('aura_list', { title: 'List sealed data', description: 'List encrypted items in the local vault by label and handle. Shows no values.',
    inputSchema: z.strictObject({ label: z.string().optional().describe('Filter to one label, e.g. "payroll"') }), annotations: { readOnlyHint: true } },
    async ({ label }) => safe(async () => {
      const items = await c.vault.list(label)
      const groups: Record<string, { kind: string; count: number; handles: string[] }> = {}
      for (const i of items) (groups[i.label] ??= { kind: i.kind, count: 0, handles: [] }, groups[i.label].count++, groups[i.label].handles.push(i.handle))
      return { labels: groups }
    }))

  server.registerTool('aura_seal_csv', { title: 'Seal a CSV column', description: 'Encrypt one numeric column of a local CSV on this machine. Returns handles only; values are never returned to you.',
    inputSchema: z.strictObject({ file: z.string().describe('Path to a local CSV'), column: z.string(), label: z.string().optional() }) },
    async ({ file, column, label }) => safe(() => sealCsv(c, file, column, label)))

  server.registerTool('aura_seal_values', { title: 'Seal values', description: 'Encrypt numbers locally. Use only for values the user typed into chat; for private data prefer the CLI "aura-fhe seal" so values never enter this conversation.',
    inputSchema: z.strictObject({ label: z.string(), values: z.array(z.number()).min(1).max(1000) }) },
    async ({ label, values }) => safe(async () => {
      const items = await sealValues(c, label, values)
      return { label, count: items.length, handles: items.map(i => i.handle), ciphertextBytesEach: items[0].bytes }
    }))

  server.registerTool('aura_compute', { title: 'Compute on ciphertext', description:
    'Run an operation on encrypted handles at the selected coprocessor. Ops: add, sub, mul, sum (many handles), scale (one handle x one public constant), weighted_sum (handles x public weights). mean = sum then scale by 1/n. Returns a new encrypted handle.',
    inputSchema: z.strictObject({ op: Op, handles: z.array(z.string()).min(1).max(64), constants: z.array(z.number()).max(64).optional()
      .describe('Public constants: one for scale, one weight per handle for weighted_sum') }) },
    async ({ op, handles, constants }) => safe(() => compute(c, op, handles, constants)))

  server.registerTool('aura_reveal', { title: 'Reveal a result', description: 'Decrypt a computed result on this machine with the local key, and cross-check it against a local plaintext recomputation. Raw sealed inputs cannot be revealed.',
    inputSchema: z.strictObject({ handle: z.string() }) },
    async ({ handle }) => safe(() => reveal(c, handle)))

  server.registerTool('aura_proof', { title: 'Reference functional checks', description:
    'Run the live proof suite against the coprocessor: key custody, semantic security, correct results under encryption, wrong-key test, server decrypt challenge, network egress scan, and a 51-step chained computation. Present every check and its evidence to the user.',
    inputSchema: z.strictObject({}) },
    async () => safe(() => runProof(c)))

  server.registerTool('aura_journal', { title: 'What left this machine', description: 'Show every request this machine sent to the coprocessor: sizes, payload types and hashes. Recorded after completed responses; failed requests may be absent.',
    inputSchema: z.strictObject({ last: z.number().int().min(1).max(200).default(20) }), annotations: { readOnlyHint: true } },
    async ({ last }) => safe(async () => {
      const all = await c.journal.all()
      return { totalRequests: all.length, totalBytesSent: all.reduce((n, e) => n + e.bytesOut, 0),
        payloadKinds: [...new Set(all.flatMap(e => e.kinds))], recent: all.slice(-last) }
    }))

  server.registerTool('aura_forget', { title: 'Forget handles', description: 'Remove handles from the local vault.',
    inputSchema: z.strictObject({ handles: z.array(z.string()).min(1).max(1000) }), annotations: { destructiveHint: true } },
    async ({ handles }) => safe(async () => ({ forgotten: await c.vault.forget(handles) })))

  return server
}
