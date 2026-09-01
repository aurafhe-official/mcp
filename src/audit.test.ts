import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('repo audit — Encrypted MCP product surface', () => {
  test('root package is @aurafhe/mcp on github.com/aurafhe-official/mcp', () => {
    const pkg = JSON.parse(read('package.json')) as {
      name: string
      description: string
      author: string
      repository: { url: string }
      homepage: string
    }
    assert.equal(pkg.name, '@aurafhe/mcp')
    assert.match(pkg.repository.url, /github\.com\/aurafhe-official\/mcp/)
    assert.match(pkg.description, /MCP server/i)
    assert.match(pkg.author, /Mochi Labs/)
    assert.match(pkg.author, /gen@afhe\.io/)
    assert.equal(pkg.homepage, 'https://afhe.io')
  })

  test('story is MCP-first for agents', () => {
    const story = read('docs/STORY.md')
    assert.match(story, /MCP server/i)
    assert.match(story, /agents/i)
    assert.match(story, /tools/i)
    assert.match(story, /Encrypt at the owner/i)
    assert.match(story, /Compute on ciphertext/i)
    assert.match(story, /Decrypt only at the recipient/i)
    assert.match(story, /Mochi Labs/)
    assert.match(story, /roadmap/i)
    assert.match(story, /aurafhe-official\/mcp/)
  })

  test('README is an MCP add-server page, not a crypto SDK', () => {
    const readme = read('README.md')
    assert.doesNotMatch(readme, /encrypted retrieval,\s*SQL,\s*inference/)
    assert.match(readme, /mcpServers/)
    assert.match(readme, /@aurafhe\/mcp/)
    assert.match(readme, /github\.com\/aurafhe-official\/mcp/)
    assert.match(readme, /agent/i)
    assert.match(readme, /docs\/assets\/aura\.png/)
  })

  test('canonical files point at aurafhe-official/mcp', () => {
    assert.match(read('server.json'), /github\.com\/aurafhe-official\/mcp/)
    assert.match(read('server.json'), /io\.github\.aurafhe-official\/mcp/)
    assert.match(read('clients/go/go.mod'), /^module github\.com\/aurafhe-official\/mcp\/clients\/go/m)
    assert.match(
      (JSON.parse(read('clients/typescript/package.json')) as { repository: { url: string } }).repository.url,
      /aurafhe-official\/mcp/,
    )
    assert.match(
      (JSON.parse(read('clients/cli/package.json')) as { repository: { url: string } }).repository.url,
      /aurafhe-official\/mcp/,
    )
    assert.match(read('clients/python/pyproject.toml'), /github\.com\/aurafhe-official\/mcp/)
    assert.doesNotMatch(read('clients/typescript/CONTRIBUTING.md'), /shield-sdk/)
    assert.match(read('LICENSE'), /Mochi Labs/)
  })
})
