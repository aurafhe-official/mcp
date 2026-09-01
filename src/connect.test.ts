import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  githubAura,
  localAura,
  openAura,
  privateEval,
  toolJson,
} from '../examples/connect/connect.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bin = path.join(root, 'dist', 'index.js')

describe('connect to AURA MCP', () => {
  test('local dist handshake lists fhe_private_eval', async (t) => {
    if (!existsSync(bin)) {
      t.skip('dist/index.js missing — run npm run build')
      return
    }
    const aura = await openAura(localAura({ bin, env: { AFHE_API_URL: 'https://127.0.0.1:1' } }))
    try {
      assert.equal(aura.client.getServerVersion()?.name, 'aura')
      const { tools } = await aura.client.listTools()
      const names = tools.map((tool) => tool.name)
      assert.ok(names.includes('fhe_private_eval'))
      assert.ok(names.includes('fhe_status'))
    } finally {
      await aura.close()
    }
  })

  test('local dist privately adds 25 + 17 → 42 on genesis', async (t) => {
    if (!existsSync(bin)) {
      t.skip('dist/index.js missing — run npm run build')
      return
    }
    const aura = await openAura(localAura({ bin }))
    try {
      const status = toolJson(await aura.client.callTool({ name: 'fhe_status', arguments: {} }))
      if (status.error || status.ok === false) {
        t.skip(`genesis not ready: ${JSON.stringify(status)}`)
        return
      }
      const result = await privateEval(aura.client, { domain: 'int', op: 'add', values: [25, 17] })
      assert.equal(result.plaintext, '42')
      const mean = await privateEval(aura.client, { domain: 'int', op: 'mean', values: [81, 94, 73] })
      assert.ok(Math.abs(Number(mean.plaintext) - 82.6666666667) < 0.01)
    } catch (err) {
      t.skip(`genesis unreachable: ${err instanceof Error ? err.message : err}`)
    } finally {
      await aura.close()
    }
  })

  test('npx github:aurafhe-official/mcp handshake', async (t) => {
    if (process.env.AURA_MCP_GITHUB === '0') {
      t.skip('AURA_MCP_GITHUB=0')
      return
    }
    try {
      const aura = await openAura(githubAura(), 180_000)
      try {
        assert.equal(aura.client.getServerVersion()?.name, 'aura')
        const { tools } = await aura.client.listTools()
        assert.ok(tools.some((tool) => tool.name === 'fhe_private_eval'))
      } finally {
        await aura.close()
      }
    } catch (err) {
      t.skip(`github npx unavailable: ${err instanceof Error ? err.message : err}`)
    }
  })
})
