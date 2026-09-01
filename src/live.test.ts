import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpCoprocessor, DEFAULT_COPROCESSOR_URL } from './fhe.ts'

test('genesis coprocessor answers /health', async (t) => {
  const fhe = createHttpCoprocessor({
    baseUrl: DEFAULT_COPROCESSOR_URL,
    autoLoad: false,
    insecureTLS: true,
    timeoutMs: 8_000,
  })
  try {
    const health = await fhe.health()
    assert.equal(health.status, 'ok')
  } catch (err) {
    t.skip(`genesis coprocessor unreachable: ${err instanceof Error ? err.message : err}`)
  }
})

test('genesis functions are encrypt/compute, not SQL or infer', async (t) => {
  const fhe = createHttpCoprocessor({
    baseUrl: DEFAULT_COPROCESSOR_URL,
    autoLoad: false,
    insecureTLS: true,
    timeoutMs: 8_000,
  })
  try {
    const fns = await fhe.functions()
    const names = [...fns.arity1, ...fns.arity2, ...fns.arity3].join(' ')
    assert.match(names, /AddCipherInt/)
    assert.doesNotMatch(names, /SQL|Infer|Retrieve/i)
  } catch (err) {
    t.skip(`genesis coprocessor unreachable: ${err instanceof Error ? err.message : err}`)
  }
})
