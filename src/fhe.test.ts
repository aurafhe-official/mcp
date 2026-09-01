import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
  FheSession,
  resolveOp,
  type Coprocessor,
  type Domain,
} from './fhe.ts'

type Slot = { domain: Domain; value: number | string }

function mockCoprocessor(): Coprocessor & { slots: Map<string, Slot>; calls: string[] } {
  const slots = new Map<string, Slot>()
  const calls: string[] = []
  let n = 0
  const put = (slot: Slot) => {
    const id = `RAW${++n}`
    slots.set(id, slot)
    return id
  }
  const num = (id: string) => {
    const v = slots.get(id)?.value
    if (typeof v !== 'number') throw new Error(`not a number: ${id}`)
    return v
  }
  return {
    slots,
    calls,
    async health() {
      calls.push('health')
      return { status: 'ok' }
    },
    async functions() {
      return {
        arity1: ['NOTCipher', 'ABSCipher', 'SqrtCipher'],
        arity2: ['AddCipherInt', 'AddCipherFloat', 'MultiplyCipherInt', 'Compare'],
        arity3: ['CMux', 'Substring', 'PowerCipher'],
      }
    },
    async encrypt(domain, value) {
      calls.push(`encrypt:${domain}:${value}`)
      const parsed = domain === 'string' ? value : Number(value)
      return put({ domain, value: parsed })
    },
    async decrypt(_domain, ciphertext) {
      calls.push(`decrypt:${ciphertext}`)
      const slot = slots.get(ciphertext)
      if (!slot) throw new Error(`unknown ciphertext ${ciphertext}`)
      return String(slot.value)
    },
    async call(fn, args) {
      calls.push(`call:${fn}`)
      if (fn === 'AddCipherInt' || fn === 'AddCipherFloat') {
        return put({ domain: 'int', value: num(args[0]) + num(args[1]) })
      }
      if (fn === 'MultiplyCipherInt') {
        return put({ domain: 'int', value: num(args[0]) * num(args[1]) })
      }
      if (fn === 'DivideCipherInt' || fn === 'DivideCipherFloat') {
        return put({ domain: 'float', value: num(args[0]) / num(args[1]) })
      }
      if (fn === 'NOTCipher') {
        return put({ domain: 'binary', value: Number(!num(args[0])) })
      }
      if (fn === 'ConcatString') {
        const a = String(slots.get(args[0])?.value ?? '')
        const b = String(slots.get(args[1])?.value ?? '')
        return put({ domain: 'string', value: a + b })
      }
      throw new Error(`unsupported mock fn ${fn}`)
    },
  }
}

describe('resolveOp', () => {
  test('maps AI op names to coprocessor functions by domain', () => {
    assert.equal(resolveOp('add', 'int', 2), 'AddCipherInt')
    assert.equal(resolveOp('add', 'float', 2), 'AddCipherFloat')
    assert.equal(resolveOp('mul', 'int', 2), 'MultiplyCipherInt')
    assert.equal(resolveOp('not', 'binary', 1), 'NOTCipher')
    assert.equal(resolveOp('concat', 'string', 2), 'ConcatString')
    assert.equal(resolveOp('AddCipherInt', 'int', 2), 'AddCipherInt')
  })

  test('rejects unknown ops', () => {
    assert.throws(() => resolveOp('hash', 'int', 2), /unknown op/i)
  })
})

describe('FheSession', () => {
  test('status reports a ready coprocessor', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const status = await session.status()
    assert.equal(status.ok, true)
    assert.equal(status.coprocessor, 'ok')
    assert.ok(status.ops.length > 0)
  })

  test('encrypt returns a short handle, not a raw blob', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const sealed = await session.encrypt('int', 25)
    assert.match(sealed.handle, /^ct_[a-z0-9]+$/)
    assert.equal(sealed.domain, 'int')
    assert.equal(sealed.ciphertext, undefined)
  })

  test('encrypt can return the raw ciphertext when asked', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const sealed = await session.encrypt('int', 25, { raw: true })
    assert.ok(sealed.ciphertext)
    assert.equal(fhe.slots.has(sealed.ciphertext!), true)
  })

  test('decrypt opens a handle to plaintext', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const sealed = await session.encrypt('int', 42)
    const opened = await session.decrypt(sealed.handle)
    assert.equal(opened.plaintext, '42')
    assert.equal(opened.domain, 'int')
  })

  test('compute folds add over handles without revealing intermediates', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const a = await session.encrypt('int', 10)
    const b = await session.encrypt('int', 20)
    const c = await session.encrypt('int', 12)
    const result = await session.compute({
      op: 'add',
      domain: 'int',
      inputs: [a.handle, b.handle, c.handle],
    })
    assert.match(result.handle, /^ct_[a-z0-9]+$/)
    assert.equal(result.plaintext, undefined)
    const opened = await session.decrypt(result.handle)
    assert.equal(opened.plaintext, '42')
  })

  test('privateEval encrypts, computes, and reveals in one AI call', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const result = await session.privateEval({
      domain: 'int',
      op: 'add',
      values: [25, 17],
      reveal: true,
    })
    assert.equal(result.plaintext, '42')
    assert.equal(result.op, 'AddCipherInt')
  })

  test('privateEval mean is sum divided by count', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const result = await session.privateEval({
      domain: 'int',
      op: 'mean',
      values: [10, 20, 30],
      reveal: true,
    })
    assert.equal(Number(result.plaintext), 20)
  })

  test('privateEval keeps the result sealed when reveal is false', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const result = await session.privateEval({
      domain: 'int',
      op: 'mul',
      values: [6, 7],
      reveal: false,
    })
    assert.equal(result.plaintext, undefined)
    assert.match(result.handle!, /^ct_[a-z0-9]+$/)
    assert.equal((await session.decrypt(result.handle!)).plaintext, '42')
  })

  test('privateEval concat works on strings', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const result = await session.privateEval({
      domain: 'string',
      op: 'concat',
      values: ['hello', ' ', 'world'],
      reveal: true,
    })
    assert.equal(result.plaintext, 'hello world')
  })

  test('compute accepts mixed plaintext and handles', async () => {
    const fhe = mockCoprocessor()
    const session = new FheSession(fhe)
    const sealed = await session.encrypt('int', 40)
    const result = await session.compute({
      op: 'add',
      domain: 'int',
      inputs: [sealed.handle, 2],
      reveal: true,
    })
    assert.equal(result.plaintext, '42')
  })

  test('unknown handle fails clearly', async () => {
    const session = new FheSession(mockCoprocessor())
    await assert.rejects(session.decrypt('ct_missing'), /unknown handle/i)
  })

  test('lists AI-facing ops, not key-block jargon', () => {
    const names = new FheSession(mockCoprocessor()).ops().map((op) => op.name)
    assert.ok(names.includes('add'))
    assert.ok(names.includes('mean'))
    assert.ok(!names.some((n) => /skb|pkb|dictb|keygen/i.test(n)))
  })

  test('defaults to the AURA genesis coprocessor, not localhost', async () => {
    const { DEFAULT_COPROCESSOR_URL } = await import('./fhe.ts')
    assert.equal(DEFAULT_COPROCESSOR_URL, 'https://api.afhe.io:8443')
    assert.ok(!DEFAULT_COPROCESSOR_URL.includes('localhost'))
  })
})
