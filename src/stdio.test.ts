import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bin = path.join(root, 'dist', 'index.js')

function send(child: ReturnType<typeof spawn>, msg: unknown) {
  child.stdin!.write(`${JSON.stringify(msg)}\n`)
}

test('stdio handshake advertises fhe_private_eval', async (t) => {
  if (!existsSync(bin)) {
    t.skip('dist/index.js missing — run npm run build')
    return
  }

  const child = spawn(process.execPath, [bin], {
    cwd: root,
    env: { ...process.env, AFHE_API_URL: 'https://127.0.0.1:1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const lines: string[] = []
  child.stdout!.setEncoding('utf8')
  child.stdout!.on('data', (chunk: string) => {
    for (const line of chunk.split('\n')) if (line.trim()) lines.push(line.trim())
  })

  send(child, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'smoke', version: '0' },
    },
  })

  const init = JSON.parse(await waitFor(lines, (line) => jsonId(line) === 1, 15_000))
  assert.equal(init.result.serverInfo.name, 'aura')
  send(child, { jsonrpc: '2.0', method: 'notifications/initialized' })
  send(child, { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
  const listed = JSON.parse(await waitFor(lines, (line) => jsonId(line) === 2, 8_000))
  const names = listed.result.tools.map((tool: { name: string }) => tool.name)
  assert.ok(names.includes('fhe_private_eval'))
  child.kill('SIGTERM')
})

function jsonId(line: string) {
  try {
    return JSON.parse(line).id
  } catch {
    return undefined
  }
}

function waitFor(lines: string[], pred: (line: string) => boolean, ms: number) {
  const start = Date.now()
  return new Promise<string>((resolve, reject) => {
    const timer = setInterval(() => {
      const hit = lines.find(pred)
      if (hit) {
        clearInterval(timer)
        resolve(hit)
        return
      }
      if (Date.now() - start > ms) {
        clearInterval(timer)
        reject(new Error(`timeout. stdout=${lines.join('\n')}`))
      }
    }, 25)
  })
}
