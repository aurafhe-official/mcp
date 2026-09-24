import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import type { Op } from './contracts.js'
import { AuraError } from './contracts.js'

export type VaultItem = {
  handle: string; label: string; kind: 'input' | 'result'; createdAt: string
  bytes: number; op?: Op; from?: string[]; plain?: number[]; engineMs?: number
}

/** Local store of ciphertexts. Holds no plaintext. Labels are the only human-readable data. */
export class Vault {
  private index = new Map<string, VaultItem>()
  private loaded = false
  constructor(private dir: string) {}
  private get indexFile() { return path.join(this.dir, 'index.json') }
  async load() {
    if (this.loaded) return
    await mkdir(path.join(this.dir, 'ct'), { recursive: true, mode: 0o700 })
    try { for (const i of JSON.parse(await readFile(this.indexFile, 'utf8')) as VaultItem[]) this.index.set(i.handle, i) } catch {}
    this.loaded = true
  }
  private async persist() {
    const tmp = this.indexFile + '.tmp'
    await writeFile(tmp, JSON.stringify([...this.index.values()], null, 1), { mode: 0o600 })
    await rename(tmp, this.indexFile)
  }
  async put(ciphertext: string, meta: Omit<VaultItem, 'handle' | 'createdAt' | 'bytes'>) {
    await this.load()
    const handle = `ct_${randomBytes(12).toString('hex')}`
    await writeFile(path.join(this.dir, 'ct', handle), ciphertext, { mode: 0o600 })
    const item: VaultItem = { handle, createdAt: new Date().toISOString(), bytes: Buffer.byteLength(ciphertext), ...meta }
    this.index.set(handle, item); await this.persist(); return item
  }
  async get(handle: string) {
    await this.load()
    const item = this.index.get(handle)
    if (!item) throw new AuraError('UNKNOWN_HANDLE', 'Call aura_list to see available handles.')
    return { item, ciphertext: await readFile(path.join(this.dir, 'ct', handle), 'utf8') }
  }
  async list(label?: string) {
    await this.load()
    return [...this.index.values()].filter(i => !label || i.label === label)
  }
  async forget(handles: string[]) {
    await this.load(); let n = 0
    for (const h of handles) if (this.index.delete(h)) n++
    await this.persist(); return n
  }
}
