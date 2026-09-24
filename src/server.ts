import { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { AuraError, Handle, MAX_INPUTS, Operation, VERSION } from './contracts.js'
import { FheSession } from './fhe.js'

async function safe(fn: () => Promise<unknown>) {
  try { return { content: [{ type: 'text' as const, text: JSON.stringify(await fn()) }] } }
  catch (e) { return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: e instanceof AuraError ? e.code : 'COPROCESSOR_REQUEST_FAILED' }) }] } }
}
export function createFheServer(session: FheSession) {
  const server = new McpServer({ name: 'aura', version: VERSION, title: 'AURA encrypted compute' }, {
    instructions: 'Diagnostic preview for synthetic data. Computation runs at Aura’s coprocessor. First check fhe_status, fhe_ops and fhe_inputs. Compute using handles and export the encrypted result for separate recipient processing. Never request plaintext, credentials, keys or file paths in chat. Fixed demo inputs are public examples. Functional arithmetic does not establish confidentiality or production readiness.',
  })
  server.registerTool('fhe_status', { description: 'Check service reachability, input configuration and release status. Health does not prove key readiness or confidentiality.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } },
    async (_, ctx) => safe(() => session.status(ctx.mcpReq.signal)))
  server.registerTool('fhe_ops', { description: 'List supported numeric operations advertised by the connected coprocessor.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } },
    async (_, ctx) => safe(() => session.ops(ctx.mcpReq.signal)))
  server.registerTool('fhe_inputs', { description: 'Get handles for the operator-provisioned encrypted inputs, or fixed public examples in demo mode. Accepts no source values or paths.', inputSchema: z.strictObject({}) },
    async (_, ctx) => safe(() => session.inputs(ctx.mcpReq.signal)))
  server.registerTool('fhe_compute', { description: 'Evaluate numeric ciphertext handles at Aura’s coprocessor. Division uses exactly two handles; a zero divisor cannot be checked locally. Returns an encrypted-result handle.', inputSchema: z.strictObject({ op: Operation, handles: z.array(Handle).min(2).max(MAX_INPUTS) }) },
    async ({ op, handles }, ctx) => safe(() => session.compute(op, handles, ctx.mcpReq.signal)))
  server.registerTool('fhe_export', { description: 'Save a computed ciphertext to the operator-configured output directory. Returns only its result ID. Decryption is outside MCP.', inputSchema: z.strictObject({ handle: Handle }) },
    async ({ handle }) => safe(() => session.exportResult(handle)))
  server.registerTool('fhe_release', { description: 'Forget selected handles in this process. Previously exported files are retained for the recipient.', inputSchema: z.strictObject({ handles: z.array(Handle).min(1).max(MAX_INPUTS) }) },
    async ({ handles }) => safe(() => session.release(handles)))
  return server
}
