import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { AuraError, Handle, MAX_INPUTS, Operation, VERSION } from './contracts.js';
export function createFheServer(session) {
    async function safe(fn) {
        try {
            return { content: [{ type: 'text', text: JSON.stringify({ ...await fn(), ...session.context() }) }] };
        }
        catch (e) {
            return { isError: true, content: [{ type: 'text', text: JSON.stringify({ ...session.context(), error: e instanceof AuraError ? e.code : 'COPROCESSOR_REQUEST_FAILED' }) }] };
        }
    }
    const server = new McpServer({ name: 'aura', version: VERSION, title: 'AURA encrypted compute' }, {
        instructions: 'FHE is the encrypted-computation base layer; MCP connects agents to Aura’s coprocessor. Start with aura_start. Use aura_roadmap for available operations and planned capabilities, aura_proof for evidence boundaries. Compute using handles and export encrypted results for separate recipient processing. Never request plaintext, credentials, keys or file paths in chat. Fixed demo inputs are public examples. Operator-bundle mode is not Verified mode. Functional arithmetic and latency measurements do not establish confidentiality or production readiness.',
    });
    server.registerTool('aura_start', { description: 'Read this first: explain the current mode and FHE base layer, check connectivity and list usable operations. Does not run or claim a verified smoke test.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async (_, ctx) => safe(() => session.start(ctx.mcpReq.signal)));
    server.registerTool('aura_roadmap', { description: 'Describe available numeric primitives, application compositions, planned binary support and the production client/server pattern. Contact Aura for separate application demonstrations.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async () => safe(async () => session.roadmap()));
    server.registerTool('aura_proof', { description: 'Report which security evidence is absent or inapplicable. This is an evidence-status report, not a cryptographic proof, journal or key-custody certification.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async () => safe(async () => session.proof()));
    server.registerTool('fhe_status', { description: 'Check service reachability, input configuration and release status. Health does not prove key readiness or confidentiality.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async (_, ctx) => safe(() => session.status(ctx.mcpReq.signal)));
    server.registerTool('fhe_ops', { description: 'List supported numeric operations advertised by the connected coprocessor.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async (_, ctx) => safe(() => session.ops(ctx.mcpReq.signal)));
    server.registerTool('fhe_inputs', { description: 'Get handles for the operator-provisioned encrypted inputs, or fixed public examples in demo mode. Accepts no source values or paths.', inputSchema: z.strictObject({}) }, async (_, ctx) => safe(() => session.inputs(ctx.mcpReq.signal)));
    server.registerTool('fhe_compute', { description: 'Evaluate numeric ciphertext handles at Aura’s coprocessor. Division uses exactly two handles; a zero divisor cannot be checked locally. Returns an encrypted-result handle.', inputSchema: z.strictObject({ op: Operation, handles: z.array(Handle).min(2).max(MAX_INPUTS) }) }, async ({ op, handles }, ctx) => safe(() => session.compute(op, handles, ctx.mcpReq.signal)));
    server.registerTool('fhe_export', { description: 'Save a computed ciphertext to the operator-configured output directory. Returns only its result ID. Decryption is outside MCP.', inputSchema: z.strictObject({ handle: Handle }) }, async ({ handle }) => safe(() => session.exportResult(handle)));
    server.registerTool('fhe_release', { description: 'Forget selected handles in this process. Previously exported files are retained for the recipient.', inputSchema: z.strictObject({ handles: z.array(Handle).min(1).max(MAX_INPUTS) }) }, async ({ handles }) => safe(() => session.release(handles)));
    return server;
}
