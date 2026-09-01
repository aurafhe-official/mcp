export type Domain = 'int' | 'float' | 'string' | 'binary'

/** Genesis coprocessor — the hosted AURA network agents connect to by default. */
export const DEFAULT_COPROCESSOR_URL = 'https://api.afhe.io:8443'

const GENESIS_HOSTS = new Set(['api.afhe.io'])

export interface Coprocessor {
  url?: string
  health(): Promise<{ status: string }>
  functions(): Promise<{ arity1: string[]; arity2: string[]; arity3: string[] }>
  encrypt(domain: Domain, value: string, pub?: boolean): Promise<string>
  decrypt(domain: Domain, ciphertext: string): Promise<string>
  call(fn: string, args: string[]): Promise<string>
}

export interface HttpCoprocessor extends Coprocessor {
  connect(): Promise<void>
}

export interface OpInfo {
  name: string
  domains: Domain[]
  arity: number
  summary: string
}

const DOMAIN_FNS: Record<string, Partial<Record<Domain, string>>> = {
  add: { int: 'AddCipherInt', float: 'AddCipherFloat' },
  sub: { int: 'SubstractCipherInt', float: 'SubstractCipherFloat' },
  mul: { int: 'MultiplyCipherInt', float: 'MultiplyCipherFloat' },
  div: { int: 'DivideCipherInt', float: 'DivideCipherFloat' },
}

const ANY_FNS: Record<string, string> = {
  xor: 'XORCipher',
  and: 'ANDCipher',
  or: 'ORCipher',
  not: 'NOTCipher',
  abs: 'ABSCipher',
  compare: 'Compare',
  concat: 'ConcatString',
  substring: 'Substring',
  sqrt: 'SqrtCipher',
  log: 'LogCipher',
  exp: 'ExpCipher',
  sin: 'SinCipher',
  cos: 'CosCipher',
  tan: 'TanCipher',
  asin: 'AsinCipher',
  acos: 'AcosCipher',
  atan: 'AtanCipher',
  sinh: 'SinhCipher',
  cosh: 'CoshCipher',
  tanh: 'TanhCipher',
  power: 'PowerCipher',
  cmux: 'CMux',
}

const UNARY = new Set([
  'not', 'abs', 'sqrt', 'log', 'exp', 'sin', 'cos', 'tan',
  'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
])
const UNARY_FNS = new Set(
  [...UNARY].map((name) => ANY_FNS[name]).filter(Boolean),
)

const AI_OPS: OpInfo[] = [
  { name: 'add', domains: ['int', 'float'], arity: 2, summary: 'Private sum. Foldable over many values.' },
  { name: 'sub', domains: ['int', 'float'], arity: 2, summary: 'Private subtract.' },
  { name: 'mul', domains: ['int', 'float'], arity: 2, summary: 'Private product. Foldable over many values.' },
  { name: 'div', domains: ['int', 'float'], arity: 2, summary: 'Private divide.' },
  { name: 'mean', domains: ['int', 'float'], arity: 2, summary: 'Private mean of many numbers.' },
  { name: 'compare', domains: ['int', 'float', 'string', 'binary'], arity: 2, summary: 'Private compare. Result stays sealed.' },
  { name: 'abs', domains: ['int', 'float'], arity: 1, summary: 'Private absolute value.' },
  { name: 'concat', domains: ['string'], arity: 2, summary: 'Private string concat. Foldable.' },
  { name: 'not', domains: ['binary'], arity: 1, summary: 'Private NOT.' },
  { name: 'xor', domains: ['binary'], arity: 2, summary: 'Private XOR.' },
  { name: 'and', domains: ['binary'], arity: 2, summary: 'Private AND.' },
  { name: 'or', domains: ['binary'], arity: 2, summary: 'Private OR.' },
  { name: 'sqrt', domains: ['float'], arity: 1, summary: 'Private sqrt.' },
  { name: 'log', domains: ['float'], arity: 1, summary: 'Private log.' },
  { name: 'exp', domains: ['float'], arity: 1, summary: 'Private exp.' },
  { name: 'sin', domains: ['float'], arity: 1, summary: 'Private sin.' },
  { name: 'cos', domains: ['float'], arity: 1, summary: 'Private cos.' },
  { name: 'tan', domains: ['float'], arity: 1, summary: 'Private tan.' },
]

export function resolveOp(op: string, domain: Domain, _arity = 2): string {
  if (/^[A-Z]/.test(op) || op.includes('Cipher')) return op
  if (op === 'mean') return DOMAIN_FNS.div[domain] ?? 'DivideCipherFloat'
  const mapped = DOMAIN_FNS[op]?.[domain] ?? ANY_FNS[op]
  if (!mapped) throw new Error(`unknown op "${op}" for domain ${domain}`)
  return mapped
}

type Stored = { ciphertext: string; domain: Domain }

export class FheSession {
  private store = new Map<string, Stored>()
  private n = 0

  constructor(private readonly fhe: Coprocessor) {}

  ops(): OpInfo[] {
    return AI_OPS
  }

  async status() {
    const health = await this.fhe.health()
    return {
      ok: health.status === 'ok',
      network: this.fhe.url ?? DEFAULT_COPROCESSOR_URL,
      coprocessor: health.status,
      handles: this.store.size,
      ops: this.ops(),
    }
  }

  async encrypt(domain: Domain, value: string | number, opts: { public?: boolean; raw?: boolean } = {}) {
    const ciphertext = await this.fhe.encrypt(domain, String(value), opts.public)
    const handle = this.remember(domain, ciphertext)
    return { handle, domain, ciphertext: opts.raw ? ciphertext : undefined }
  }

  async decrypt(handle: string) {
    const stored = this.lookup(handle)
    const plaintext = await this.fhe.decrypt(stored.domain, stored.ciphertext)
    return { plaintext, domain: stored.domain, handle }
  }

  async compute(opts: {
    op: string
    domain: Domain
    inputs: Array<string | number>
    reveal?: boolean
    raw?: boolean
  }) {
    if (opts.op === 'mean') {
      return this.privateEval({
        domain: opts.domain,
        op: 'mean',
        values: opts.inputs,
        reveal: opts.reveal,
        sealedInputs: true,
      })
    }
    const sealed = await Promise.all(opts.inputs.map((input) => this.sealInput(opts.domain, input)))
    const fn = resolveOp(opts.op, opts.domain, sealed.length)
    const ciphertext = await this.fold(fn, sealed)
    return this.finish(opts.domain, fn, ciphertext, opts.reveal, opts.raw)
  }

  async privateEval(opts: {
    domain: Domain
    op: string
    values: Array<string | number>
    reveal?: boolean
    raw?: boolean
    sealedInputs?: boolean
  }) {
    const domain: Domain = opts.op === 'mean' && opts.domain === 'int' ? 'float' : opts.domain
    const sealed = await Promise.all(
      opts.values.map((value) => this.sealInput(domain, value, opts.sealedInputs)),
    )
    if (opts.op === 'mean') {
      const sumFn = resolveOp('add', domain, 2)
      const sum = await this.fold(sumFn, sealed)
      const count = await this.fhe.encrypt(domain, String(sealed.length))
      const divFn = resolveOp('div', domain, 2)
      const mean = await this.fhe.call(divFn, [sum, count])
      return this.finish('float', 'mean', mean, opts.reveal, opts.raw)
    }
    const fn = resolveOp(opts.op, opts.domain, sealed.length)
    const ciphertext = await this.fold(fn, sealed)
    return this.finish(opts.domain, fn, ciphertext, opts.reveal, opts.raw)
  }

  private async sealInput(domain: Domain, input: string | number, allowHandle = true) {
    if (allowHandle && typeof input === 'string' && this.store.has(input)) {
      return this.lookup(input).ciphertext
    }
    return this.fhe.encrypt(domain, String(input))
  }

  private async fold(fn: string, args: string[]) {
    if (args.length === 0) throw new Error('need at least one input')
    if (UNARY_FNS.has(fn)) return this.fhe.call(fn, args.slice(0, 1))
    if (args.length === 1) return args[0]
    let acc = args[0]
    for (const next of args.slice(1)) acc = await this.fhe.call(fn, [acc, next])
    return acc
  }

  private async finish(domain: Domain, op: string, ciphertext: string, reveal?: boolean, raw?: boolean) {
    const handle = this.remember(domain, ciphertext)
    const plaintext = reveal ? (await this.fhe.decrypt(domain, ciphertext)) : undefined
    return { handle, domain, op, plaintext, ciphertext: raw ? ciphertext : undefined }
  }

  private remember(domain: Domain, ciphertext: string) {
    const handle = `ct_${(++this.n).toString(36)}`
    this.store.set(handle, { ciphertext, domain })
    return handle
  }

  private lookup(handle: string) {
    const stored = this.store.get(handle)
    if (!stored) throw new Error(`unknown handle ${handle}`)
    return stored
  }
}

export interface HttpCoprocessorOptions {
  baseUrl: string
  fetch?: typeof fetch
  apiKey?: string
  autoLoad?: boolean
  timeoutMs?: number
  insecureTLS?: boolean
  keys?: { skb?: string; pkb?: string; dictb?: string }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

function isLocalhost(url: string): boolean {
  const host = hostnameOf(url)
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]'
}

function isGenesis(url: string): boolean {
  return GENESIS_HOSTS.has(hostnameOf(url))
}

async function buildFetch(baseUrl: string, insecure: boolean, provided?: typeof fetch): Promise<typeof fetch> {
  if (provided) return provided
  const fallback = globalThis.fetch.bind(globalThis)
  if (!insecure) return fallback
  try {
    const undici = await import('undici')
    const agent = new undici.Agent({ connect: { rejectUnauthorized: false } })
    return ((input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) =>
      undici.fetch(input as never, { ...init, dispatcher: agent } as never)) as typeof fetch
  } catch {
    return fallback
  }
}

export function createHttpCoprocessor(opts: HttpCoprocessorOptions): HttpCoprocessor {
  const baseUrl = opts.baseUrl.replace(/\/+$/, '')
  const headers: Record<string, string> = {}
  if (opts.apiKey) headers.authorization = `Bearer ${opts.apiKey}`
  const timeoutMs = opts.timeoutMs ?? 120_000
  const insecureTLS = opts.insecureTLS ?? (isLocalhost(baseUrl) || isGenesis(baseUrl))
  let fetchImpl: typeof fetch | undefined = opts.fetch
  const ready = buildFetch(baseUrl, insecureTLS, opts.fetch).then((fn) => {
    fetchImpl = fn
    return fn
  })

  async function request<T>(method: string, path: string, body?: unknown, ms = timeoutMs): Promise<T> {
    const fetchFn = fetchImpl ?? (await ready)
    const res = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: body === undefined ? headers : { ...headers, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(ms),
    })
    const text = await res.text()
    let parsed: unknown = undefined
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error(`non-JSON response from ${path}`)
      }
    }
    if (!res.ok) {
      const msg =
        parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed
          ? String((parsed as { error: unknown }).error)
          : `HTTP ${res.status} from ${path}`
      throw new Error(msg)
    }
    return parsed as T
  }

  const fhe: HttpCoprocessor = {
    url: baseUrl,
    health: () => request('GET', '/health'),
    functions: () => request('GET', '/functions'),
    encrypt: async (domain, value, pub = false) => {
      const res = await request<{ ciphertext: string }>('POST', `/encrypt/${domain}`, {
        value: String(value),
        public: pub,
      })
      return res.ciphertext
    },
    decrypt: async (domain, ciphertext) => {
      const res = await request<{ plaintext: string }>('POST', `/decrypt/${domain}`, { ciphertext })
      return res.plaintext
    },
    call: async (fn, args) => {
      const res = await request<{ result: string }>('POST', '/call', { fn, args })
      return res.result
    },
    async connect() {
      const health = await request<{ status: string }>('GET', '/health', undefined, 3_000)
      if (health.status !== 'ok') throw new Error(`coprocessor unhealthy: ${health.status}`)
      if (opts.autoLoad === false) return
      await request('POST', '/load', {
        skb: opts.keys?.skb ?? 'file/skb',
        pkb: opts.keys?.pkb ?? 'file/pkb',
        dictb: opts.keys?.dictb ?? 'file/dictb',
      }, 3_000)
    },
  }
  return fhe
}

export function envCoprocessor(): HttpCoprocessor {
  const timeout = process.env.AFHE_TIMEOUT_MS ? Number(process.env.AFHE_TIMEOUT_MS) : undefined
  const insecure = process.env.AFHE_INSECURE_TLS
  return createHttpCoprocessor({
    baseUrl: process.env.AFHE_API_URL ?? DEFAULT_COPROCESSOR_URL,
    apiKey: process.env.AFHE_API_KEY ?? process.env.AFHE_API_TOKEN,
    timeoutMs: Number.isFinite(timeout) ? timeout : undefined,
    insecureTLS: insecure == null ? undefined : insecure === '1' || insecure === 'true',
  })
}
