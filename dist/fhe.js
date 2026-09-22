/** Genesis coprocessor — the hosted AURA network agents connect to by default. */
export const DEFAULT_COPROCESSOR_URL = 'https://api.afhe.io:8443';
const DOMAIN_FNS = {
    add: { int: 'AddCipherInt', float: 'AddCipherFloat' },
    sub: { int: 'SubstractCipherInt', float: 'SubstractCipherFloat' },
    mul: { int: 'MultiplyCipherInt', float: 'MultiplyCipherFloat' },
    div: { int: 'DivideCipherInt', float: 'DivideCipherFloat' },
};
const ANY_FNS = {
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
};
const UNARY = new Set([
    'not', 'abs', 'sqrt', 'log', 'exp', 'sin', 'cos', 'tan',
    'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh',
]);
const UNARY_FNS = new Set([...UNARY].map((name) => ANY_FNS[name]).filter(Boolean));
const AI_OPS = [
    { name: 'add', domains: ['int', 'float'], arity: 2, summary: 'Private sum. Foldable over many values.' },
    { name: 'sub', domains: ['int', 'float'], arity: 2, summary: 'Private subtract.' },
    { name: 'mul', domains: ['int', 'float'], arity: 2, summary: 'Private product. Foldable over many values.' },
    { name: 'div', domains: ['int', 'float'], arity: 2, summary: 'Private divide.' },
    { name: 'mean', domains: ['int', 'float'], arity: 2, summary: 'Private mean of many numbers.' },
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
];
export function resolveOp(op, domain, arity = 2) {
    const info = AI_OPS.find((candidate) => candidate.name === op ||
        DOMAIN_FNS[candidate.name]?.[domain] === op || ANY_FNS[candidate.name] === op);
    if (!info)
        throw new Error(`unknown op "${op}" for domain ${domain}; use fhe_ops`);
    if (!info.domains.includes(domain))
        throw new Error(`unsupported domain ${domain} for ${info.name}`);
    const foldable = ['add', 'mul', 'concat', 'mean'].includes(info.name);
    if (arity < 1 || (!foldable && arity !== info.arity)) {
        throw new Error(`${info.name} requires ${foldable ? 'at least one input' : `${info.arity} inputs`}`);
    }
    op = info.name;
    if (op === 'mean')
        return DOMAIN_FNS.div[domain] ?? 'DivideCipherFloat';
    const mapped = DOMAIN_FNS[op]?.[domain] ?? ANY_FNS[op];
    if (!mapped)
        throw new Error(`unknown op "${op}" for domain ${domain}`);
    return mapped;
}
export class FheSession {
    fhe;
    store = new Map();
    n = 0;
    constructor(fhe) {
        this.fhe = fhe;
    }
    ops() {
        return AI_OPS.map((op) => ({ ...op, domains: [...op.domains] }));
    }
    async status() {
        const health = await this.fhe.health();
        return {
            ok: health.status === 'ok',
            network: this.fhe.url ?? DEFAULT_COPROCESSOR_URL,
            coprocessor: health.status,
            handles: this.store.size,
            ops: this.ops(),
        };
    }
    async encrypt(domain, value, opts = {}) {
        const ciphertext = await this.fhe.encrypt(domain, String(value), opts.public);
        const handle = this.remember(domain, ciphertext);
        return { handle, domain, ciphertext: opts.raw ? ciphertext : undefined };
    }
    async decrypt(handle) {
        const stored = this.lookup(handle);
        const plaintext = await this.fhe.decrypt(stored.domain, stored.ciphertext);
        return { plaintext, domain: stored.domain, handle };
    }
    async compute(opts) {
        resolveOp(opts.op, opts.domain, opts.inputs.length);
        if (opts.op === 'mean') {
            return this.privateEval({
                domain: opts.domain,
                op: 'mean',
                values: opts.inputs,
                reveal: opts.reveal,
                raw: opts.raw,
                sealedInputs: true,
            });
        }
        this.validateHandles(opts.domain, opts.inputs);
        const sealed = await Promise.all(opts.inputs.map((input) => this.sealInput(opts.domain, input)));
        const fn = resolveOp(opts.op, opts.domain, sealed.length);
        const ciphertext = await this.fold(fn, sealed);
        return this.finish(opts.domain, fn, ciphertext, opts.reveal, opts.raw);
    }
    async privateEval(opts) {
        resolveOp(opts.op, opts.domain, opts.values.length);
        const domain = opts.op === 'mean' && opts.domain === 'int' ? 'float' : opts.domain;
        if (opts.sealedInputs)
            this.validateHandles(domain, opts.values);
        const sealed = await Promise.all(opts.values.map((value) => this.sealInput(domain, value, opts.sealedInputs ?? false)));
        if (opts.op === 'mean') {
            const sumFn = resolveOp('add', domain, 2);
            const sum = await this.fold(sumFn, sealed);
            const count = await this.fhe.encrypt(domain, String(sealed.length));
            const divFn = resolveOp('div', domain, 2);
            const mean = await this.fhe.call(divFn, [sum, count]);
            return this.finish('float', 'mean', mean, opts.reveal, opts.raw);
        }
        const fn = resolveOp(opts.op, opts.domain, sealed.length);
        const ciphertext = await this.fold(fn, sealed);
        return this.finish(opts.domain, fn, ciphertext, opts.reveal, opts.raw);
    }
    async sealInput(domain, input, allowHandle = true) {
        if (allowHandle && typeof input === 'string' && input.startsWith('ct_')) {
            const stored = this.lookup(input);
            if (stored.domain !== domain)
                throw new Error(`handle domain mismatch: expected ${domain}, got ${stored.domain}; mean requires float handles`);
            return stored.ciphertext;
        }
        return this.fhe.encrypt(domain, String(input));
    }
    validateHandles(domain, inputs) {
        for (const input of inputs) {
            if (typeof input !== 'string' || !input.startsWith('ct_'))
                continue;
            const stored = this.lookup(input);
            if (stored.domain !== domain)
                throw new Error(`handle domain mismatch: expected ${domain}, got ${stored.domain}; mean requires float handles`);
        }
    }
    async fold(fn, args) {
        if (args.length === 0)
            throw new Error('need at least one input');
        if (UNARY_FNS.has(fn))
            return this.fhe.call(fn, args.slice(0, 1));
        if (args.length === 1)
            return args[0];
        let acc = args[0];
        for (const next of args.slice(1))
            acc = await this.fhe.call(fn, [acc, next]);
        return acc;
    }
    async finish(domain, op, ciphertext, reveal, raw) {
        const handle = this.remember(domain, ciphertext);
        const plaintext = reveal ? (await this.fhe.decrypt(domain, ciphertext)) : undefined;
        return { handle, domain, op, plaintext, ciphertext: raw ? ciphertext : undefined };
    }
    remember(domain, ciphertext) {
        const handle = `ct_${(++this.n).toString(36)}`;
        this.store.set(handle, { ciphertext, domain });
        return handle;
    }
    lookup(handle) {
        const stored = this.store.get(handle);
        if (!stored)
            throw new Error(`unknown handle ${handle}`);
        return stored;
    }
}
async function buildFetch(baseUrl, insecure, provided) {
    if (provided)
        return provided;
    const fallback = globalThis.fetch.bind(globalThis);
    if (!insecure)
        return fallback;
    try {
        const undici = await import('undici');
        const agent = new undici.Agent({ connect: { rejectUnauthorized: false } });
        return ((input, init) => undici.fetch(input, { ...init, dispatcher: agent }));
    }
    catch {
        return fallback;
    }
}
export function createHttpCoprocessor(opts) {
    const baseUrl = opts.baseUrl.replace(/\/+$/, '');
    const headers = {};
    if (opts.apiKey)
        headers.authorization = `Bearer ${opts.apiKey}`;
    const timeoutMs = opts.timeoutMs ?? 120_000;
    const insecureTLS = opts.insecureTLS ?? false;
    let fetchImpl = opts.fetch;
    const ready = buildFetch(baseUrl, insecureTLS, opts.fetch).then((fn) => {
        fetchImpl = fn;
        return fn;
    });
    async function request(method, path, body, ms = timeoutMs) {
        const fetchFn = fetchImpl ?? (await ready);
        const res = await fetchFn(`${baseUrl}${path}`, {
            method,
            headers: body === undefined ? headers : { ...headers, 'content-type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(ms),
        });
        const text = await res.text();
        let parsed = undefined;
        if (text) {
            try {
                parsed = JSON.parse(text);
            }
            catch {
                throw new Error(`non-JSON response from ${path}`);
            }
        }
        if (!res.ok) {
            const msg = parsed && typeof parsed === 'object' && parsed !== null && 'error' in parsed
                ? String(parsed.error)
                : `HTTP ${res.status} from ${path}`;
            throw new Error(msg);
        }
        return parsed;
    }
    function stringField(value, field) {
        if (!value || typeof value !== 'object' || typeof value[field] !== 'string') {
            throw new Error(`invalid backend response: expected string ${field}`);
        }
        return value[field];
    }
    const fhe = {
        url: baseUrl,
        health: () => request('GET', '/health'),
        functions: () => request('GET', '/functions'),
        encrypt: async (domain, value, pub = false) => {
            const res = await request('POST', `/encrypt/${domain}`, {
                value: String(value),
                public: pub,
            });
            return stringField(res, 'ciphertext');
        },
        decrypt: async (domain, ciphertext) => {
            const res = await request('POST', `/decrypt/${domain}`, { ciphertext });
            return stringField(res, 'plaintext');
        },
        call: async (fn, args) => {
            const res = await request('POST', '/call', { fn, args });
            return stringField(res, 'result');
        },
        async connect() {
            const health = await request('GET', '/health', undefined, 3_000);
            if (health.status !== 'ok')
                throw new Error(`coprocessor unhealthy: ${health.status}`);
            if (opts.autoLoad === false)
                return;
            await request('POST', '/load', {
                skb: opts.keys?.skb ?? 'file/skb',
                pkb: opts.keys?.pkb ?? 'file/pkb',
                dictb: opts.keys?.dictb ?? 'file/dictb',
            }, 3_000);
        },
    };
    return fhe;
}
export function envCoprocessor() {
    const timeout = process.env.AFHE_TIMEOUT_MS ? Number(process.env.AFHE_TIMEOUT_MS) : undefined;
    const insecure = process.env.AFHE_INSECURE_TLS;
    return createHttpCoprocessor({
        baseUrl: process.env.AFHE_API_URL ?? DEFAULT_COPROCESSOR_URL,
        apiKey: process.env.AFHE_API_KEY ?? process.env.AFHE_API_TOKEN,
        timeoutMs: Number.isFinite(timeout) ? timeout : undefined,
        insecureTLS: insecure == null ? undefined : insecure === '1' || insecure === 'true',
    });
}
