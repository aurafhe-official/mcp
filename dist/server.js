import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { AuraError, Handle, MAX_INPUTS, Operation, VERSION } from './contracts.js';
import { DEMO_PROMPT, HOST_GUIDANCE, errorHelp } from './guide.js';
export function createFheServer(session) {
    async function safe(fn) {
        try {
            return { content: [{ type: 'text', text: JSON.stringify({ ...await fn(), ...session.context() }) }] };
        }
        catch (e) {
            const code = e instanceof AuraError ? e.code : 'COPROCESSOR_REQUEST_FAILED';
            return { isError: true, content: [{ type: 'text', text: JSON.stringify({ ...session.context(), error: code, help: errorHelp(code) }) }] };
        }
    }
    const server = new McpServer({ name: 'aura', version: VERSION, title: 'AURA encrypted compute' }, {
        instructions: HOST_GUIDANCE + ' Use aura_roadmap for available operations and planned capabilities, aura_proof for evidence boundaries. Operator-bundle mode is not Verified mode. Functional arithmetic and latency measurements do not establish confidentiality or production readiness.',
    });
    server.registerPrompt('aura_demo', { title: 'Show me encrypted computing', description: 'A guided first demo for someone who has never used FHE.', argsSchema: z.strictObject({}) }, () => ({ messages: [{ role: 'user', content: { type: 'text', text: DEMO_PROMPT } }] }));
    server.registerTool('aura_start', { title: 'Start here: your first Aura demo', description: 'Begin a plain-language tour: explain FHE, introduce public example numbers and return the next action. Check connection and operations. No key setup is needed for Demo mode. Does not compute or decrypt.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async (_, ctx) => safe(() => session.start(ctx.mcpReq.signal)));
    server.registerTool('aura_roadmap', { description: 'Describe available numeric primitives, application compositions, planned binary support and the production client/server pattern. Contact Aura for separate application demonstrations.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async () => safe(async () => session.roadmap()));
    server.registerTool('aura_proof', { description: 'Report which security evidence is absent or inapplicable. This is an evidence-status report, not a cryptographic proof, journal or key-custody certification.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async () => safe(async () => session.proof()));
    server.registerTool('fhe_status', { description: 'Check service reachability, input configuration and release status. Health does not prove key readiness or confidentiality.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async (_, ctx) => safe(() => session.status(ctx.mcpReq.signal)));
    server.registerTool('fhe_ops', { description: 'List supported numeric operations advertised by the connected coprocessor.', inputSchema: z.strictObject({}), annotations: { readOnlyHint: true } }, async (_, ctx) => safe(() => session.ops(ctx.mcpReq.signal)));
    server.registerTool('fhe_inputs', { title: 'Prepare the example', description: 'Get references for the encrypted inputs. In Demo mode, return a plain-language explanation and exact next calculation arguments. Keep references behind the scenes. Accepts no source values or paths.', inputSchema: z.strictObject({}) }, async (_, ctx) => safe(() => session.inputs(ctx.mcpReq.signal)));
    server.registerTool('fhe_compute', { title: 'Calculate with encrypted data', description: 'Evaluate encrypted references at Aura’s service. Demo mode explains the returned encrypted result and how to save it. Division uses exactly two handles; a zero divisor cannot be checked locally. Never describe the expected answer as a decrypted result.', inputSchema: z.strictObject({ op: Operation, handles: z.array(Handle).min(2).max(MAX_INPUTS) }) }, async ({ op, handles }, ctx) => safe(() => session.compute(op, handles, ctx.mcpReq.signal)));
    server.registerTool('fhe_export', { title: 'Save and explain the result', description: 'Save the encrypted result to the configured folder. Demo mode returns a plain-language recap and choices for what to explore next. No decryption or readable answer is returned.', inputSchema: z.strictObject({ handle: Handle }) }, async ({ handle }) => safe(() => session.exportResult(handle)));
    server.registerTool('fhe_release', { description: 'Forget selected handles in this process. Previously exported files are retained for the recipient.', inputSchema: z.strictObject({ handles: z.array(Handle).min(1).max(MAX_INPUTS) }) }, async ({ handles }) => safe(() => session.release(handles)));
    return server;
}
