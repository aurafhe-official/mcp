import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
// Full history is required: an old merge can reintroduce removed files while
// leaving the latest tree clean. Only inspect this branch, never private backups.
const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim()
assert.equal(shallow, 'false', 'History verification requires a full checkout')
const roots = execFileSync('git', ['rev-list', '--max-parents=0', 'HEAD'], { encoding: 'utf8' }).trim()
assert.equal(roots, 'b185b462399d966ed8210c09a086865ad2cdea7f', 'Uncleaned or unrelated history was introduced; re-clone the cleaned repository')
const found = execFileSync('git', ['rev-list', 'HEAD', '--', 'native/', 'docs/evidence/', 'src/native.ts', 'src/owner.ts', 'dist/native.js', 'dist/owner.js'], { encoding: 'utf8' }).trim()
assert.equal(found, '', 'Removed private integration files are reachable in branch history; do not merge old clones')
console.log('PASS current branch history excludes removed private integration paths')
