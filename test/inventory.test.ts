import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readdir, readFile } from 'node:fs/promises'

test('production source and distribution contain only public client modules',async()=>{
  const modules=['contracts','coprocessor','fhe','index','server']
  assert.deepEqual((await readdir('src')).sort(),modules.map(n=>`${n}.ts`).sort())
  assert.deepEqual((await readdir('dist')).sort(),modules.flatMap(n=>[`${n}.js`,`${n}.d.ts`]).sort())
  for(const name of modules){
    const source=await readFile(`src/${name}.ts`,'utf8')
    assert.ok(!/node:(?:child_process|fs|fs\/promises)/.test(source),`${name} must not run engine code or read owner files`)
  }
})
