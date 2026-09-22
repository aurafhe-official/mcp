import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { AuraError, Handle, MAX_INPUTS, OpaqueId, Operation, VERSION } from './contracts.js';
async function safe(fn) {
    try {
        return { content: [{ type: 'text', text: JSON.stringify(await fn()) }] };
    }
    catch (e) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: e instanceof AuraError ? e.code : 'COPROCESSOR_REQUEST_FAILED' }) }] };
    }
}
export function createFheServer(session) {
    const server = new McpServer({ name: 'aura', version: VERSION, title: 'AURA encrypted compute' }, {
        instructions: 'All computation runs through Aura’s authenticated coprocessor. Use only owner-provided encrypted dataset IDs. Never request source values, credentials or keys in chat. Import references, compute, then export the encrypted result for the authorized recipient. This MCP has no plaintext input, encryption, decryption, raw engine dispatch or local computation tools.',
    });
    server.registerTool('fhe_status', { description: 'Check the configured coprocessor session readiness.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async (_, ctx) => safe(() => session.status(ctx.mcpReq.signal)));
    server.registerTool('fhe_ops', { description: 'List public operations enabled for this authenticated session.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async (_, ctx) => safe(() => session.ops(ctx.mcpReq.signal)));
    server.registerTool('fhe_import', { description: 'Open a dataset already encrypted and provisioned through the owner application. Returns local handles.', inputSchema: z.strictObject({ datasetId: OpaqueId }) }, async ({ datasetId }, ctx) => safe(() => session.importDataset(datasetId, ctx.mcpReq.signal)));
    server.registerTool('fhe_compute', { description: 'Ask Aura’s coprocessor to evaluate an enabled operation on encrypted handles. Returns a handle without revealing plaintext.', inputSchema: z.strictObject({ op: Operation, handles: z.array(Handle).min(1).max(MAX_INPUTS) }) }, async ({ op, handles }, ctx) => safe(() => session.compute(op, handles, ctx.mcpReq.signal)));
    server.registerTool('fhe_export', { description: 'Request an encrypted result for the authorized recipient. Returns a result reference; no download URL or plaintext.', inputSchema: z.strictObject({ handle: Handle }) }, async ({ handle }, ctx) => safe(() => session.exportResult(handle, ctx.mcpReq.signal)));
    server.registerTool('fhe_release', { description: 'Release this session’s selected encrypted references.', inputSchema: z.strictObject({ handles: z.array(Handle).min(1).max(MAX_INPUTS) }) }, async ({ handles }, ctx) => safe(() => session.release(handles, ctx.mcpReq.signal)));
    return server;
}
