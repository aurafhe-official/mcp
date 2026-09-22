import { test } from 'node:test'
import assert from 'node:assert/strict'
import { githubAura, localAura, openAura } from '../examples/connect/connect.ts'

test('default local MCP advertises ciphertext computation and no plaintext tools', async () => {
  const aura=await openAura(localAura())
  try {
    const names=(await aura.client.listTools()).tools.map(x=>x.name)
    assert.ok(names.includes('fhe_compute'))
    for (const name of ['fhe_encrypt','fhe_decrypt','fhe_private_eval']) assert.ok(!names.includes(name))
  } finally { await aura.close() }
})
test('explicit GitHub installation check fails on installation or handshake errors', {skip:process.env.AURA_MCP_GITHUB!=='1'}, async () => {
  const aura=await openAura(githubAura(),180000)
  try {
    assert.ok((await aura.client.listTools()).tools.some(x=>x.name==='fhe_compute'))
  } finally { await aura.close() }
})
