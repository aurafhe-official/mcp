#!/usr/bin/env node
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/client'
import {
  getDefaultEnvironment,
  StdioClientTransport,
  type StdioServerParameters,
} from '@modelcontextprotocol/client/stdio'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

export function stdioEnv(extra: Record<string, string> = {}): Record<string, string> {
  return { ...getDefaultEnvironment(), ...extra }
}

export function localAura(opts: { bin?: string; env?: Record<string, string> } = {}): StdioServerParameters {
  return {
    command: process.execPath,
    args: [opts.bin ?? path.join(root, 'dist', 'index.js')],
    cwd: root,
    env: stdioEnv(opts.env),
  }
}

export function githubAura(opts: { env?: Record<string, string> } = {}): StdioServerParameters {
  return {
    command: 'npx',
    args: ['-y', 'github:aurafhe-official/mcp'],
    env: stdioEnv(opts.env),
  }
}

export function toolJson(result: { isError?: boolean; content: Array<{ type: string; text?: string }> }) {
  const text = result.content.find((block) => block.type === 'text')?.text ?? ''
  const parsed = text ? (JSON.parse(text) as Record<string, unknown>) : {}
  if (result.isError) throw new Error(String(parsed.error ?? text))
  return parsed
}

export async function openAura(server: StdioServerParameters, timeout = 20_000) {
  const transport = new StdioClientTransport({ ...server, stderr: 'pipe' })
  const err: string[] = []
  transport.stderr?.setEncoding('utf8')
  transport.stderr?.on('data', (chunk: string) => err.push(chunk))
  const client = new Client({ name: 'aura-connect-test', version: '0' })
  try {
    await client.connect(transport, { timeout })
  } catch (cause) {
    await client.close().catch(() => undefined)
    throw new Error(`${cause instanceof Error ? cause.message : cause}\nstderr: ${err.join('')}`)
  }
  return {
    client,
    close: () => client.close(),
  }
}

export async function privateEval(
  client: Client,
  args: { domain: string; op: string; values: Array<string | number>; reveal?: boolean },
  timeout = 120_000,
) {
  return toolJson(
    await client.callTool(
      { name: 'fhe_private_eval', arguments: { reveal: true, ...args } },
      { timeout },
    ),
  )
}

async function main() {
  const github = process.argv.includes('--github')
  const aura = await openAura(github ? githubAura() : localAura(), github ? 180_000 : 20_000)
  try {
    const info = aura.client.getServerVersion()
    const { tools } = await aura.client.listTools()
    const via = github ? 'github:aurafhe-official/mcp' : 'local dist'
    console.log(`connected ${info?.name}@${info?.version} via ${via}`)
    console.log(`tools ${tools.map((tool) => tool.name).join(', ')}`)
    const status = toolJson(await aura.client.callTool({ name: 'fhe_status', arguments: {} }))
    console.log(`status ${status.coprocessor} ${status.network}`)
    const sum = await privateEval(aura.client, { domain: 'int', op: 'add', values: [25, 17] })
    console.log(`private 25+17 = ${sum.plaintext}`)
    if (sum.plaintext !== '42') throw new Error(`expected 42, got ${sum.plaintext}`)
    if (!github) {
      const mean = await privateEval(aura.client, { domain: 'int', op: 'mean', values: [81, 94, 73] })
      console.log(`private mean(81,94,73) = ${mean.plaintext}`)
      if (!Number.isFinite(Number(mean.plaintext)) || Number(mean.plaintext) === 0) {
        throw new Error(`mean empty: ${JSON.stringify(mean)}`)
      }
    }
  } finally {
    await aura.close()
  }
}

const entry = process.argv[1] && path.resolve(process.argv[1])
if (entry && entry === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
