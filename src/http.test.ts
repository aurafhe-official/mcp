import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { test } from 'node:test'
import assert from 'node:assert/strict'

test('unauthenticated HTTP mode fails closed before connecting to the backend', async () => {
  await assert.rejects(
    promisify(execFile)(process.execPath, ['dist/index.js','--http'], {timeout:5000}),
    (err: unknown) => {
      const e=err as {code:number;stderr:string}
      assert.equal(e.code,1)
      assert.match(e.stderr,/HTTP mode disabled: authenticated caller isolation/)
      return true
    },
  )
})
