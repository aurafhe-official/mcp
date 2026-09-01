import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { Client } from '@modelcontextprotocol/client'
import { InMemoryTransport } from '@modelcontextprotocol/server'
import { FheSession, type Coprocessor, type Domain } from './fhe.ts'
import { createFheServer } from './server.ts'

function mockCoprocessor(): Coprocessor {
  const slots = new Map<string, { domain: Domain; value: number | string }>()
  let n = 0
  const put = (slot: { domain: Domain; value: number | string }) => {
    const id = `RAW${++n}`
    slots.set(id, slot)
    return id
  }
  const num = (id: string) => Number(slots.get(id)?.value)
  return {
    health: async () => ({ status: 'ok' }),
    functions: async () => ({ arity1: [], arity2: ['AddCipherInt'], arity3: [] }),
    encrypt: async (domain, value) => put({ domain, value: domain === 'string' ? value : Number(value) }),
    decrypt: async (_d, ciphertext) => String(slots.get(ciphertext)?.value),
    call: async (fn, args) => {
      if (fn === 'AddCipherInt') return put({ domain: 'int', value: num(args[0]) + num(args[1]) })
      throw new Error(fn)
    },
  }
}

function textOf(result: { content: Array<{ type: string; text?: string }> }) {
  const block = result.content.find((item) => item.type === 'text')
  assert.ok(block?.text)
  return JSON.parse(block.text) as Record<string, unknown>
}

describe('Aura FHE MCP server', () => {
  async function connect() {
    const session = new FheSession(mockCoprocessor())
    const server = createFheServer(session)
    const client = new Client({ name: 'test', version: '0' })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)
    return { client, session }
  }

  test('advertises AI private-compute tools, not keygen', async () => {
    const { client } = await connect()
    const { tools } = await client.listTools()
    const names = tools.map((tool) => tool.name).sort()
    assert.deepEqual(names, [
      'fhe_compute',
      'fhe_decrypt',
      'fhe_encrypt',
      'fhe_ops',
      'fhe_private_eval',
      'fhe_status',
    ])
    assert.ok(tools.every((tool) => !/keygen|skb|pkb|ciphertext engine/i.test(tool.description ?? '')))
  })

  test('fhe_private_eval is the one-shot AI path', async () => {
    const { client } = await connect()
    const result = await client.callTool({
      name: 'fhe_private_eval',
      arguments: { domain: 'int', op: 'add', values: [25, 17], reveal: true },
    })
    assert.equal(textOf(result).plaintext, '42')
  })

  test('fhe_encrypt returns a handle the model can pass around', async () => {
    const { client } = await connect()
    const sealed = textOf(
      await client.callTool({
        name: 'fhe_encrypt',
        arguments: { domain: 'int', value: 7 },
      }),
    )
    assert.match(String(sealed.handle), /^ct_/)
    const opened = textOf(
      await client.callTool({
        name: 'fhe_decrypt',
        arguments: { handle: sealed.handle },
      }),
    )
    assert.equal(opened.plaintext, '7')
  })

  test('private-compute prompt exists', async () => {
    const { client } = await connect()
    const { prompts } = await client.listPrompts()
    assert.ok(prompts.some((prompt) => prompt.name === 'private-compute'))
  })
})
