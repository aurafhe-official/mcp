import assert from 'node:assert/strict'
import http from 'node:http'
import { Coprocessor } from '../dist/coprocessor.js'

// Authentication failures, transport errors and server errors must not pass
// the missing-decrypt-route check.
let status = 404
const server = http.createServer((_, res) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end('{}')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const remote = new Coprocessor({ endpoint: `http://127.0.0.1:${server.address().port}`, journal: { record: async () => {} } })
try {
  for (const [code, expected] of [[404, 'REFUSED_NO_CAPABILITY'], [200, 'SERVER_RETURNED_SOMETHING'], [401, 'INCONCLUSIVE'], [500, 'INCONCLUSIVE']]) {
    status = code
    assert.equal(await remote.challengeDecrypt('synthetic-test-value'), expected)
  }
} finally { await new Promise(resolve => server.close(resolve)) }
assert.equal(await remote.challengeDecrypt('synthetic-test-value'), 'INCONCLUSIVE')
console.log('PASS: unavailable or denied decrypt checks are inconclusive, never evidence of blindness.')
