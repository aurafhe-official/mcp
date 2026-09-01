import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('repo audit — MCP only', () => {
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
    assert.equal(pkg.homepage, 'https://afhe.io')
  })

  test('this repo is MCP only — no language SDKs', () => {
    assert.equal(existsSync(join(root, 'clients')), false)
    const readme = read('README.md')
    assert.doesNotMatch(readme, /Language SDKs/)
    assert.doesNotMatch(readme, /clients\//)
    assert.match(readme, /mcpServers/)
    assert.match(readme, /docs\/assets\/aura\.png/)
  })

  test('story is MCP-first for agents', () => {
    const story = read('docs/STORY.md')
    assert.match(story, /MCP server/i)
    assert.match(story, /agents/i)
    assert.doesNotMatch(story, /Language SDKs/)
    assert.match(story, /aurafhe-official\/mcp/)
  })

  test('GitHub home is aurafhe-official/mcp, not an unpublished npm or /mcp on genesis', () => {
    const readme = read('README.md')
    assert.doesNotMatch(readme, /github\.com\/aurafhe\/mcp/)
    assert.match(readme, /not on npm yet/)
    const protocol = read('docs/PROTOCOL.md')
    assert.match(protocol, /There is \*\*no\*\*/)
    assert.match(protocol, /28 Aug 2026/)
    assert.doesNotMatch(protocol, /Clients in this repo/)
    const bugs = read('.github/ISSUE_TEMPLATE/bug_report.md')
    assert.doesNotMatch(bugs, /one of the clients/)
    assert.match(read('docs/GITHUB.md'), /aurafhe-official\/mcp/)
  })
})
