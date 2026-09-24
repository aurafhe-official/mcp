import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readdir, readFile } from 'node:fs/promises'

test('public package is limited to adapter modules, with no engine or owner implementation',async()=>{
  const modules=['artifacts','contracts','coprocessor','fhe','index','server']
  assert.deepEqual((await readdir('src')).sort(),modules.map(n=>`${n}.ts`).sort())
  assert.deepEqual((await readdir('dist')).sort(),modules.flatMap(n=>[`${n}.js`,`${n}.d.ts`]).sort())
  for(const name of modules){
    const source=await readFile(`src/${name}.ts`,'utf8')
    assert.ok(!/node:child_process|ffi-napi|LoadSK|LoadPK|GenSK|GenPK/.test(source))
    if(name!=='artifacts')assert.ok(!/node:fs/.test(source))
  }
  const gate=JSON.parse(await readFile('release-status.json','utf8'))
  assert.equal(gate.productionReady,false);assert.equal(gate.confidentialityGate,'blocked')
})
