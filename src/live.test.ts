import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpCoprocessor, DEFAULT_COPROCESSOR_URL } from './fhe.ts'

test('explicit live backend check fails on network or result errors', {skip: process.env.AURA_LIVE_TESTS !== '1'}, async () => {
  const fhe=createHttpCoprocessor({baseUrl:process.env.AFHE_API_URL ?? DEFAULT_COPROCESSOR_URL,autoLoad:false,insecureTLS:false,timeoutMs:8000})
  assert.equal((await fhe.health()).status,'ok')
  assert.ok((await fhe.functions()).arity2.includes('AddCipherInt'))
})
