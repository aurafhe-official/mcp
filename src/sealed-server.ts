import { McpServer } from '@modelcontextprotocol/server'
import * as z from 'zod/v4'
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { InputBundle, MAX_BUNDLE_BYTES, SealedSession, computeClient, type ResultBundle } from './sealed.js'

const Handle = z.string().regex(/^ct_[a-f0-9]{32}$/)
const answer = (value: unknown, isError = false) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }], isError })
export function createSealedServer(session?: SealedSession, save?: (result: ResultBundle) => Promise<void>) {
  const server = new McpServer({ name: 'aura', version: '0.5.0-preview.1' }, {
    instructions: 'Ciphertext-only tools. The owner prepares encrypted inputs outside this model. Use fhe_inputs, fhe_ops, fhe_compute, then fhe_export_result. There are no plaintext input, encryption, decryption, arbitrary file, or reveal tools. The owner decrypts exported results separately. Backend cryptography and key isolation require operator verification.',
  })
  const ready = () => { if (!session) throw new Error('Owner bundle and compute worker must be configured before computation'); return session }
  async function run(work: () => unknown | Promise<unknown>) {
    try { return answer(await work()) }
    catch (err) { return answer({ error: err instanceof Error ? err.message : 'Operation failed' }, true) }
  }
  server.registerTool('fhe_status', { description: 'Connection status; does not certify cryptography', annotations: { readOnlyHint: true } }, () => run(() => session ? session.status() : { mode: 'ciphertext-only', configured: false, cryptographyVerified: false }))
  server.registerTool('fhe_inputs', { description: 'List owner-provided encrypted input handles; no plaintext', annotations: { readOnlyHint: true } }, () => run(() => ({ inputs: ready().inputs() })))
  server.registerTool('fhe_ops', { description: 'Supported typed compute mappings present in the worker function catalog', annotations: { readOnlyHint: true } }, () => run(() => ready().ops()))
  server.registerTool('fhe_compute', {
    description: 'Compute on handles only. Ciphertext leaves this process; plaintext and secret keys do not enter these tool arguments.',
    inputSchema: z.object({ op: z.enum(['add', 'sub', 'mul', 'div']), inputs: z.array(Handle).min(2).max(128) }).strict(),
    annotations: { readOnlyHint: false, openWorldHint: true },
  }, ({ op, inputs }) => run(() => ready().compute(op, inputs)))
  server.registerTool('fhe_export_result', {
    description: 'Save an encrypted result for the owner to decrypt separately. Does not return plaintext or accept a destination path.',
    inputSchema: z.object({ handle: Handle }).strict(),
    annotations: { readOnlyHint: false, openWorldHint: false },
  }, ({ handle }) => run(async () => {
    if (!save) throw new Error('Owner result destination is not configured')
    const result = ready().exportResult(handle)
    await save(result)
    return { resultId: result.resultId, domain: result.domain, encrypted: true }
  }))
  return server
}

export async function configuredSealedServer() {
  const bundlePath = process.env.AFHE_INPUT_BUNDLE, workerUrl = process.env.AFHE_COMPUTE_URL, keyId = process.env.AFHE_KEY_ID
  if (!bundlePath && !workerUrl && !keyId) return createSealedServer()
  if (!bundlePath || !workerUrl || !keyId) throw new Error('Set AFHE_INPUT_BUNDLE, AFHE_COMPUTE_URL, and AFHE_KEY_ID together')
  if (!isAbsolute(bundlePath) || (await stat(bundlePath)).size > MAX_BUNDLE_BYTES) throw new Error('Input bundle must be an absolute path within the size limit')
  const bundle = InputBundle.parse(JSON.parse(await readFile(bundlePath, 'utf8')))
  if (bundle.keyId !== keyId) throw new Error('Owner bundle key identifier does not match the configured worker')
  const worker = computeClient(workerUrl, process.env.AFHE_COMPUTE_API_KEY)
  if ((await worker.health()).keyId !== keyId) throw new Error('Worker key identifier does not match the owner bundle')
  const session = new SealedSession(worker, bundle)
  const destination = process.env.AFHE_RESULT_DIR
  if (destination && !isAbsolute(destination)) throw new Error('AFHE_RESULT_DIR must be an absolute path')
  return createSealedServer(session, destination ? async (result) => {
    await mkdir(destination, { recursive: true, mode: 0o700 })
    await writeFile(join(destination, result.resultId + '.json'), JSON.stringify(result), { mode: 0o600, flag: 'wx' })
  } : undefined)
}
