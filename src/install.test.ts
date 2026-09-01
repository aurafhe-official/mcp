import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('anyone can add this MCP', () => {
  test('package is npx-ready (bin + shebang + dist)', () => {
    const pkg = JSON.parse(read('package.json')) as {
      name: string
      bin: Record<string, string>
      files: string[]
    }
    assert.equal(pkg.name, '@aurafhe/mcp')
    assert.equal(pkg.bin.mcp, 'dist/index.js')
    assert.ok(pkg.files.includes('dist'))
    const bin = read('dist/index.js')
    assert.match(bin, /^#!\/usr\/bin\/env node/)
    assert.ok(existsSync(join(root, 'dist/index.js')))
  })

  test('host snippets use a GitHub npx that works before npm publish', () => {
    const cursor = JSON.parse(read('examples/mcp/cursor.json')) as {
      mcpServers: { aura: { command: string; args: string[] } }
    }
    assert.equal(cursor.mcpServers.aura.command, 'npx')
    assert.ok(cursor.mcpServers.aura.args.includes('github:aurafhe-official/mcp'))

    const vscode = JSON.parse(read('examples/mcp/vscode.json')) as {
      servers: { aura: { command: string; args: string[]; type: string } }
    }
    assert.equal(vscode.servers.aura.type, 'stdio')
    assert.ok(vscode.servers.aura.args.includes('github:aurafhe-official/mcp'))

    const readme = read('README.md')
    assert.match(readme, /github:aurafhe-official\/mcp/)
    assert.match(readme, /mcpServers/)
    assert.ok(existsSync(join(root, 'docs/assets/aura.png')))
    assert.ok(existsSync(join(root, 'docs/assets/social.png')))
  })
})
