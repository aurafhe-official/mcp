import { randomBytes } from 'node:crypto'
import { AuraError, Ciphertext, FUNCTIONS, InputBundle, MAX_BUNDLE, MAX_INPUTS, Operation, type Domain, type ResultBundle } from './contracts.js'
import type { Coprocessor } from './coprocessor.js'

type Stored = { domain: Domain; ciphertext: string; expiresAt: number; operation?: Operation }
type Options = { bundle?: InputBundle; demo?: (signal?: AbortSignal) => Promise<InputBundle>; writeResult: (value: ResultBundle) => Promise<void>; now?: () => number }
/** Session-local handles; ciphertext arithmetic always runs at the coprocessor. */
export class FheSession {
  private handles = new Map<string, Stored>()
  private inputHandles: string[] = []
  private keyId?: string
  private loaded = false
  private busy = false
  private calls: number[] = []
  private now: () => number
  constructor(private remote: Coprocessor, private options: Options) {
    this.now = options.now ?? Date.now
    if (options.bundle && options.demo) throw new AuraError('DEMO_AND_BUNDLE_CONFLICT')
  }
  context() {
    return { mode: this.options.demo ? 'fixed-synthetic-demo' : this.options.bundle ? 'operator-bundle' : 'unconfigured',
      keyCustodyModel: this.options.demo ? 'backend-keyed' : 'not-verified',
      confidentialityClaimed: false, confidentialityVerified: false, productionReady: false }
  }
  roadmap() {
    return { foundation: 'FHE is the encrypted-computation layer; MCP connects agents to that layer. Applications compose its operations.',
      availableThroughMcp: ['int/float add', 'int/float sub', 'int/float mul', 'int/float div'],
      compositions: ['sum', 'product', 'float mean using an encrypted count', 'weighted sum using encrypted weights'],
      nextRelease: { status: 'planned', capability: 'binary operations' },
      requiresSeparateIntegration: ['encrypted database', 'encrypted model inference', 'custom application circuits'],
      completedApplications: { applications: ['FHE database', 'FHE-AI LLM inference'], status: 'completed',
        availability: 'available on request via gen@afhe.io', source: 'Aura team confirmation', exposedThroughDemoMcp: false },
      productionPattern: 'Owner-side keys and encryption -> authenticated ciphertext computation -> authorized recipient-side decryption.',
      verifiedMode: { status: 'not available in this release', evidenceRequired: ['client encryption/decryption integration', 'server key-custody and authorization validation', 'independent cryptographic review'] },
      openSource: { available: ['MCP adapter', 'adapter tests', 'synthetic live verifier'],
        notIncluded: ['client cryptographic implementation', 'coprocessor implementation', 'cryptographic proof suite'],
        furtherDisclosures: 'Scope and dates will be announced separately by Aura.' },
      contact: 'gen@afhe.io' }
  }
  proof() {
    return { scope: 'Evidence boundaries, not a cryptographic proof or live security audit.',
      keyCustody: { status: this.options.demo ? 'not-applicable-to-demo' : 'not-verified',
        explanation: this.options.demo ? 'Demo encryption and decryption are backend services.' : 'Worker metadata is a declaration, not proof of secret-key absence.' },
      serverZeroDecryption: { status: 'not-verified' },
      independentCryptographicReview: { status: 'not-verified' },
      networkJournal: { status: 'not-implemented' },
      correctness: { status: 'run-separate-verifier', command: 'npm run test:live',
        explanation: 'The source-checkout verifier decrypts only fixed synthetic results outside MCP and reports numerical error.' } }
  }
  async start(signal?: AbortSignal) {
    const status = await this.status(signal)
    const operations = await this.ops(signal)
    return { ...status, ...operations,
      readThisFirst: { purpose: 'Demonstrate ciphertext computation through Aura MCP. FHE is the base layer; applications are built from its operations.',
        demo: 'Backend-keyed Demo mode with fixed public examples; backend encryption/decryption. Demonstrates functionality, not confidentiality against Aura.',
        production: 'Owner-side encryption and recipient-side decryption with an authenticated compute-only service. Verified mode is not shipped here.',
        openSource: 'This repository publishes the adapter and its tests; additional cryptographic components are not included.' },
      nextSteps: this.options.demo ? ['Call fhe_inputs for fixed public inputs.', 'Call fhe_compute with add and integer input handles 0 and 1.', 'Call fhe_export for the computed handle. Verify its expected value of 42 outside MCP.', 'Call aura_proof for evidence boundaries or aura_roadmap for application pathways.']
        : this.options.bundle ? ['Call fhe_inputs to obtain operator-provisioned handles.', 'Computation checks the worker declaration and key ID before dispatch.', 'Export results for separate recipient processing; this is not Verified mode.']
        : ['Reconnect with --demo for the public walkthrough, or have your operator provision encrypted inputs.'],
      smokeTest: { status: 'not-run', explanation: 'This onboarding call checks connectivity and capabilities; it does not decrypt or assert arithmetic correctness.' } }
  }
  private async exclusive<T>(fn: () => Promise<T>) {
    if (this.busy) throw new AuraError('BUSY')
    this.calls = this.calls.filter(t => t > this.now() - 60_000)
    if (this.calls.length >= 120) throw new AuraError('RATE_LIMIT')
    this.calls.push(this.now()); this.busy = true
    try { this.purge(); return await fn() } finally { this.busy = false }
  }
  private purge() { for (const [h, ref] of this.handles) if (ref.expiresAt <= this.now()) this.handles.delete(h) }
  private remember(ref: Stored) {
    Ciphertext.parse(ref.ciphertext)
    if (this.handles.size >= 512 || [...this.handles.values()].reduce((n,r) => n + Buffer.byteLength(r.ciphertext), 0) + Buffer.byteLength(ref.ciphertext) > 32 * 1024 * 1024) throw new AuraError('HANDLE_LIMIT')
    const handle = `ct_${randomBytes(16).toString('hex')}`
    this.handles.set(handle, ref)
    return { handle, domain: ref.domain, expiresAt: ref.expiresAt }
  }
  private lookup(handle: string) {
    const ref = this.handles.get(handle)
    if (!ref || ref.expiresAt <= this.now()) throw new AuraError('UNKNOWN_OR_EXPIRED_HANDLE')
    return ref
  }
  async status(signal?: AbortSignal) {
    return this.exclusive(async () => {
      await this.remote.health(signal)
      return { ...this.context(), backendReachable: true, execution: 'aura-coprocessor',
        inputsConfigured: Boolean(this.options.bundle || this.options.demo), productionReady: false, confidentialityVerified: false }
    })
  }
  private async capabilities(signal?: AbortSignal) {
    const advertised = new Set((await this.remote.functions(signal)).arity2)
    return Object.entries(FUNCTIONS).flatMap(([op, domains]) => Object.entries(domains)
      .filter(([,fn]) => advertised.has(fn)).map(([domain]) => ({ op, domain, minInputs: 2, maxInputs: op === 'sub' || op === 'div' ? 2 : MAX_INPUTS })))
  }
  async ops(signal?: AbortSignal) { return this.exclusive(async () => ({ ops: await this.capabilities(signal) })) }
  async inputs(signal?: AbortSignal) {
    return this.exclusive(async () => {
      if (!this.loaded) {
        const source = this.options.bundle ?? await this.options.demo?.(signal)
        if (!source) throw new AuraError('INPUT_BUNDLE_REQUIRED_OR_USE_DEMO')
        const bundle = InputBundle.parse(source)
        if (Buffer.byteLength(JSON.stringify(bundle)) > MAX_BUNDLE) throw new AuraError('INPUT_BUNDLE_LIMIT')
        if (signal?.aborted) throw new AuraError('CANCELLED')
        this.keyId = bundle.keyId
        this.inputHandles = bundle.inputs.map(ref => this.remember({ ...ref, expiresAt: this.now() + 30 * 60_000 }).handle)
        this.loaded = true
      }
      return { inputs: this.inputHandles.flatMap((handle,index) => {
        const ref = this.handles.get(handle)
        return ref ? [{ handle, index, domain: ref.domain, expiresAt: ref.expiresAt }] : []
      }) }
    })
  }
  async compute(op: Operation, handles: string[], signal?: AbortSignal) {
    return this.exclusive(async () => {
      const started = performance.now()
      Operation.parse(op)
      if (handles.length < 2 || handles.length > MAX_INPUTS || ((op === 'sub' || op === 'div') && handles.length !== 2)) throw new AuraError('INVALID_OPERATION')
      const refs = handles.map(h => this.lookup(h)), domain = refs[0].domain
      if (refs.some(r => r.domain !== domain)) throw new AuraError('DOMAIN_MISMATCH')
      if (this.handles.size >= 512) throw new AuraError('HANDLE_LIMIT')
      const health = await this.remote.health(signal)
      if (!this.options.demo && (health.role !== 'compute' || health.secretKeyLoaded !== false || health.keyId !== this.keyId)) throw new AuraError('COMPUTE_ONLY_KEY_SCOPE_REQUIRED')
      if (!(await this.capabilities(signal)).some(c => c.op === op && c.domain === domain)) throw new AuraError('OPERATION_UNAVAILABLE')
      let ciphertext = refs[0].ciphertext
      for (const ref of refs.slice(1)) {
        if (signal?.aborted) throw new AuraError('CANCELLED')
        ciphertext = Ciphertext.parse(await this.remote.call(FUNCTIONS[op][domain], [ciphertext,ref.ciphertext], signal))
      }
      if (signal?.aborted) throw new AuraError('CANCELLED')
      const expiresAt = Math.min(...refs.map(ref => ref.expiresAt))
      if (expiresAt <= this.now()) throw new AuraError('UNKNOWN_OR_EXPIRED_HANDLE')
      return { ...this.remember({ domain, ciphertext, operation: op, expiresAt }),
        metrics: { clientElapsedMs: Math.round((performance.now() - started) * 100) / 100,
          ciphertextBytes: Buffer.byteLength(ciphertext), remoteComputeCalls: refs.length - 1,
          timingScope: 'Includes worker checks, network and remote evaluation; not engine-only time.',
          precisionClass: domain === 'float' ? 'approximate' : 'backend-integer-semantics', accuracyVerified: false } }
    })
  }
  async exportResult(handle: string) {
    return this.exclusive(async () => {
      const ref = this.lookup(handle)
      if (!ref.operation || !this.keyId) throw new AuraError('COMPUTED_RESULT_REQUIRED')
      const resultId = `ct_${randomBytes(16).toString('hex')}`
      await this.options.writeResult({ version: 1, keyId: this.keyId, resultId, domain: ref.domain, ciphertext: ref.ciphertext, operation: ref.operation })
      return { resultId, domain: ref.domain, encrypted: true }
    })
  }
  async release(handles: string[]) {
    return this.exclusive(async () => {
      if (!handles.length || handles.length > MAX_INPUTS) throw new AuraError('INVALID_HANDLES')
      const unique = [...new Set(handles)]
      unique.forEach(h => this.lookup(h))
      unique.forEach(h => this.handles.delete(h))
      return { released: unique.length }
    })
  }
}
