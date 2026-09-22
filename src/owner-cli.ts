#!/usr/bin/env node
import { readFile, writeFile, stat } from 'node:fs/promises'
import { ownerClient } from './owner.js'
import { MAX_BUNDLE_BYTES, ResultBundle } from './sealed.js'

async function main() {
  const [action, input, output] = process.argv.slice(2)
  if (!input || (action !== 'prepare' && action !== 'decrypt') || (action === 'prepare' && !output)) throw new Error('Usage: aura-owner prepare plaintext.json encrypted.json | aura-owner decrypt encrypted-result.json')
  const ownerUrl = process.env.AFHE_OWNER_URL, workerUrl = process.env.AFHE_COMPUTE_URL, keyId = process.env.AFHE_KEY_ID
  if (!ownerUrl || !workerUrl || !keyId) throw new Error('Configure AFHE_OWNER_URL, AFHE_COMPUTE_URL, and AFHE_KEY_ID on the owner device')
  if ((await stat(input)).size > MAX_BUNDLE_BYTES) throw new Error('Input exceeds size limit')
  const value = JSON.parse(await readFile(input, 'utf8'))
  const owner = ownerClient(ownerUrl, workerUrl, keyId, process.env.AFHE_OWNER_API_KEY)
  if (action === 'prepare') {
    if (!value || !Array.isArray(value.values)) throw new Error('Input must contain domain and values')
    const encrypted = await owner.prepare(value.domain, value.values)
    await writeFile(output, JSON.stringify(encrypted), { mode: 0o600, flag: 'wx' })
    console.error('Encrypted bundle created. Transfer only this bundle to the MCP host.')
  } else {
    const result = ResultBundle.parse(value)
    console.error(`Owner-authorized local reveal: ${result.operation} result ${result.resultId}`)
    console.log(await owner.decrypt(result))
  }
}
main().catch(() => { console.error('Owner operation failed. Check configuration, input schema, key identifier, and local runtime availability.'); process.exitCode = 1 })
