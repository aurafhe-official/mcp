import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'

/** Request metadata recorded after responses. Only the last 256 request bodies
 * are retained in memory for fragment matching; headers and failed requests
 * are not covered. This is not a complete or tamper-evident traffic audit. */
export type JournalEntry = {
  at: string; method: string; path: string; bytesOut: number; bytesIn: number
  kinds: string[]; sha256: string; status: number; ms: number
}

export class Journal {
  private entries: JournalEntry[] = []
  private payloads: string[] = []
  constructor(private file: string) {}
  async record(e: Omit<JournalEntry, 'at' | 'sha256'>, body: string) {
    const entry = { at: new Date().toISOString(), sha256: createHash('sha256').update(body).digest('hex'), ...e }
    this.entries.push(entry); this.payloads.push(body)
    if (this.payloads.length > 256) this.payloads.shift()
    await mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 })
    await appendFile(this.file, JSON.stringify(entry) + '\n', { mode: 0o600 })
  }
  session() { return [...this.entries] }
  /** True if any recorded outbound payload contains the probe (e.g. secret key bytes). */
  containsInOutbound(probe: string) {
    const needles = [probe.slice(0, 64), probe.slice(Math.floor(probe.length / 2), Math.floor(probe.length / 2) + 64)]
    return this.payloads.some(p => needles.some(n => n.length >= 32 && p.includes(n)))
  }
  async all() {
    try { return (await readFile(this.file, 'utf8')).trim().split('\n').filter(Boolean).map(l => JSON.parse(l) as JournalEntry) }
    catch { return [] }
  }
}
