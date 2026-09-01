import { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { FheSession, envCoprocessor, type Domain } from './fhe.js'

const DomainSchema = z.enum(['int', 'float', 'string', 'binary'])
const VERSION = '0.4.0'

function json(data: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    isError,
  }
}

function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  return json({ error: message }, true)
}

export function createFheServer(session: FheSession = new FheSession(envCoprocessor())): McpServer {
  const server = new McpServer(
    {
      name: 'aura',
      version: VERSION,
      title: 'AURA MCP',
      websiteUrl: 'https://afhe.io',
    },
    {
      instructions:
        'AURA is an MCP server for private compute. Use these tools like any other MCP tools. Call fhe_status first, then fhe_private_eval. Inputs are sealed before you see them. You get handles (ct_…) or only the final revealed answer. Never ask the user to paste secrets into chat. Never print raw ciphertext.',
    },
  )

  server.registerTool(
    'fhe_status',
    {
      title: 'Private compute status',
      description:
        'MCP health check. Call this first so the agent knows the private-compute tools are online.',
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        return json(await session.status())
      } catch (err) {
        return fail(err)
      }
    },
  )

  server.registerTool(
    'fhe_ops',
    {
      title: 'List private ops',
      description:
        'List the private ops this MCP server can run (add, mean, concat, …). Pass these names to fhe_private_eval.',
      annotations: { readOnlyHint: true, idempotentHint: true },
    },
    async () => json({ ops: session.ops() }),
  )

  server.registerTool(
    'fhe_encrypt',
    {
      title: 'Seal a value',
      description:
        'Encrypt a value for private AI compute. Returns a short handle (ct_…) the model can pass to later tools. The model must not treat the handle as plaintext.',
      inputSchema: z.object({
        domain: DomainSchema.describe('Value type: int, float, string, or binary'),
        value: z.union([z.string(), z.number()]).describe('Plaintext to seal'),
        public: z.boolean().optional().describe('Use public-key encrypt when the data owner should not share a secret key'),
        raw: z.boolean().optional().describe('Also return the raw ciphertext blob'),
      }),
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ domain, value, public: pub, raw }) => {
      try {
        return json(await session.encrypt(domain as Domain, value, { public: pub, raw }))
      } catch (err) {
        return fail(err)
      }
    },
  )

  server.registerTool(
    'fhe_decrypt',
    {
      title: 'Reveal a sealed result',
      description:
        'Decrypt a handle from fhe_encrypt / fhe_compute / fhe_private_eval. Only call this when the user asked to see the plaintext result.',
      inputSchema: z.object({
        handle: z.string().describe('Handle such as ct_1'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
    },
    async ({ handle }) => {
      try {
        return json(await session.decrypt(handle))
      } catch (err) {
        return fail(err)
      }
    },
  )

  server.registerTool(
    'fhe_compute',
    {
      title: 'Run a private operation',
      description:
        'Compute on sealed handles (and optional plaintext, which is sealed first). Does not decrypt unless reveal=true. Prefer fhe_private_eval for one-shot AI work.',
      inputSchema: z.object({
        op: z.string().describe('AI op name from fhe_ops, e.g. add, mul, mean, concat'),
        domain: DomainSchema,
        inputs: z.array(z.union([z.string(), z.number()])).min(1)
          .describe('Handles (ct_…) and/or plaintext values'),
        reveal: z.boolean().optional().describe('Decrypt the final result'),
      }),
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ op, domain, inputs, reveal }) => {
      try {
        return json(await session.compute({ op, domain: domain as Domain, inputs, reveal }))
      } catch (err) {
        return fail(err)
      }
    },
  )

  server.registerTool(
    'fhe_private_eval',
    {
      title: 'One-shot private compute',
      description:
        'The main agent tool. Seals inputs, runs the op (add, mul, mean, concat, …) without showing intermediates, and optionally reveals only the final answer. Prefer this over encrypt/compute/decrypt.',
      inputSchema: z.object({
        domain: DomainSchema.describe('int for integers, float for real math, string for text, binary for bits'),
        op: z.string().describe('add | sub | mul | div | mean | concat | compare | … (see fhe_ops)'),
        values: z.array(z.union([z.string(), z.number()])).min(1)
          .describe('Plaintext inputs. They are sealed before compute.'),
        reveal: z.boolean().optional().describe('If true (typical for AI answers), return plaintext of the final result only'),
      }),
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ domain, op, values, reveal }) => {
      try {
        return json(
          await session.privateEval({
            domain: domain as Domain,
            op,
            values,
            reveal: reveal ?? true,
          }),
        )
      } catch (err) {
        return fail(err)
      }
    },
  )

  server.registerPrompt(
    'private-compute',
    {
      title: 'Private compute',
      description: 'Ask the agent to compute on user data without reading the plaintext values.',
      argsSchema: z.object({
        task: z.string().describe('What to compute privately, e.g. "mean of these salaries"'),
      }),
    },
    ({ task }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Use Aura FHE private compute. Do not ask the user to paste secrets into chat if a tool can seal them.',
              'Workflow: fhe_status → fhe_private_eval (reveal=true only for the final answer).',
              'Never print raw ciphertext. Use handles (ct_…).',
              `Task: ${task}`,
            ].join('\n'),
          },
        },
      ],
    }),
  )

  server.registerResource(
    'status',
    'fhe://status',
    {
      title: 'AURA MCP status',
      description: 'Live status for this MCP server and its private-compute backend',
      mimeType: 'application/json',
    },
    async (uri) => {
      const status = await session.status()
      return {
        contents: [
          {
            uri: String(uri),
            mimeType: 'application/json',
            text: JSON.stringify(status, null, 2),
          },
        ],
      }
    },
  )

  return server
}

export { VERSION }
