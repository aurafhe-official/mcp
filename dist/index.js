#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createFheServer } from './server.js';
import { envCoprocessor, FheSession } from './fhe.js';
import { configuredSealedServer } from './sealed-server.js';
async function main() {
    if (process.argv.includes('--http')) {
        throw new Error('HTTP mode disabled: authenticated caller isolation is required. Use a separate stdio process per trusted user.');
    }
    if (!process.argv.includes('--trusted-demo')) {
        const server = await configuredSealedServer();
        serveStdio(() => server);
        console.error('AURA MCP: ciphertext-only stdio mode');
        return;
    }
    console.error('AURA MCP: trusted demo mode; backend and model can see plaintext. Synthetic data only.');
    const coprocessor = envCoprocessor();
    try {
        await coprocessor.connect();
    }
    catch {
        console.error('AURA MCP: demo backend unavailable; tool calls may fail.');
    }
    const session = new FheSession(coprocessor);
    serveStdio(() => createFheServer(session));
}
main().catch(() => { console.error('AURA MCP startup failed. Check configuration. HTTP mode disabled: authenticated caller isolation is required.'); process.exitCode = 1; });
