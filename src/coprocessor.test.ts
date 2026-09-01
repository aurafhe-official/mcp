import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { createHttpCoprocessor } from './fhe.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('createHttpCoprocessor', () => {
  test('health hits GET /health', async () => {
    const calls: Array<{ url: string; method: string }> = []
    const fhe = createHttpCoprocessor({
      baseUrl: 'https://localhost:8443/',
      fetch: async (input, init) => {
        calls.push({ url: String(input), method: String(init?.method ?? 'GET') })
        return jsonResponse({ status: 'ok' })
      },
    })
    assert.deepEqual(await fhe.health(), { status: 'ok' })
    assert.equal(calls[0].url, 'https://localhost:8443/health')
    assert.equal(calls[0].method, 'GET')
  })

  test('encrypt posts domain and stringifies values', async () => {
    let body: unknown
    const fhe = createHttpCoprocessor({
      baseUrl: 'https://example.test',
      fetch: async (_input, init) => {
        body = JSON.parse(String(init?.body))
        return jsonResponse({ ciphertext: 'CT' })
      },
    })
    assert.equal(await fhe.encrypt('int', '25'), 'CT')
    assert.deepEqual(body, { value: '25', public: false })
  })

  test('load is invoked when connecting with autoLoad', async () => {
    const paths: string[] = []
    const fhe = createHttpCoprocessor({
      baseUrl: 'https://example.test',
      fetch: async (input, init) => {
        const url = String(input)
        paths.push(url)
        if (url.endsWith('/health')) return jsonResponse({ status: 'ok' })
        if (url.endsWith('/load')) return jsonResponse({ loaded: ['skb', 'pkb', 'dictb'] })
        throw new Error(url)
      },
    })
    await fhe.connect()
    assert.ok(paths.some((p) => p.endsWith('/health')))
    assert.ok(paths.some((p) => p.endsWith('/load')))
  })

  test('sends Authorization when AFHE_API_KEY is set', async () => {
    let headers: Headers | undefined
    const fhe = createHttpCoprocessor({
      baseUrl: 'https://example.test',
      apiKey: 'secret-token',
      fetch: async (_input, init) => {
        headers = new Headers(init?.headers)
        return jsonResponse({ status: 'ok' })
      },
    })
    await fhe.health()
    assert.equal(headers?.get('authorization'), 'Bearer secret-token')
  })

  test('wraps non-2xx as a readable AI error', async () => {
    const fhe = createHttpCoprocessor({
      baseUrl: 'https://example.test',
      fetch: async () => jsonResponse({ error: 'keys not loaded' }, 500),
    })
    await assert.rejects(fhe.health(), /keys not loaded/)
  })
})
