import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const files = readdirSync('test').filter(f => f.endsWith('.test.ts')).sort().map(f => `test/${f}`)
if (!files.length) throw new Error('No adapter tests found')
const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...files], { stdio: 'inherit', windowsHide: true })
if (result.error) throw result.error
process.exitCode = result.status ?? 1
