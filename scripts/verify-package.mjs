import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
// npm_execpath is available under npm run on every supported platform.
assert.ok(process.env.npm_execpath,'Run through npm run test:package')
function npm(args,cwd=root) {
  return execFileSync(process.execPath,[process.env.npm_execpath,...args],{cwd,encoding:'utf8',windowsHide:true,timeout:120_000})
}
await mkdir(path.join(root,'.work'),{recursive:true})
const dir=await mkdtemp(path.join(root,'.work','package-'))
const packed=JSON.parse(npm(['pack','--json','--pack-destination',dir]))[0]
const files=packed.files.map(f=>f.path)
for(const required of ['dist/index.js','dist/coprocessor.js','docs/QUICKSTART.md']) assert.ok(files.includes(required),required)
// Explicit inventory: adding a directory to package.json is not enough to ship it.
const allowed = /^(?:package\.json|release-status\.json|README\.md|README\.zh-CN\.md|SECURITY\.md|LICENSE|dist\/(?:index|server|contracts|fhe|guide|coprocessor|artifacts)\.(?:js|d\.ts)|docs\/(?:ARCHITECTURE|PROTOCOL|QUICKSTART|SECURITY-MODEL|VERIFICATION|INVESTOR-DEMO)\.md)$/
assert.deepEqual(files.filter(f=>!allowed.test(f)),[], 'Unexpected file in public package')
const consumer=path.join(dir,'consumer');await mkdir(consumer)
await writeFile(path.join(consumer,'package.json'), JSON.stringify({ name: 'aura-package-verification', version: '1.0.0', private: true }))
npm(['install','--ignore-scripts','--no-audit','--no-fund',path.join(dir,packed.filename)],consumer)
const entry=path.join(consumer,'node_modules','@aurafhe','mcp','dist','index.js')
const version=JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version
assert.equal(execFileSync(process.execPath,[entry,'--version'],{encoding:'utf8'}).trim(),version)
const settings=JSON.parse(execFileSync(process.execPath,[entry,'--config','cursor','--demo'],{encoding:'utf8'}))
assert.equal(settings.mcpServers.aura.args.at(-1),'--demo')
assert.equal(settings.mcpServers.aura.command,process.execPath)
assert.equal(settings.mcpServers.aura.args[0],entry)
const client=new Client({name:'aura-package-test',version:'1'})
try {
  // Exercise the generated configuration exactly as an MCP host would use it.
  await client.connect(new StdioClientTransport({...settings.mcpServers.aura,stderr:'pipe'}))
  assert.equal(client.getServerVersion().version,version)
  assert.equal((await client.listTools()).tools.length,9)
  assert.ok((await client.listPrompts()).prompts.some(p=>p.name==='aura_demo'))
  assert.ok(client.getInstructions().includes('never heard of FHE'))
} finally { await client.close() }
console.log(`PASS public client installation ${version}: ${files.length} approved files`)
