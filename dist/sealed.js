import { randomBytes } from 'node:crypto';
import * as z from 'zod/v4';
export const MAX_BUNDLE_BYTES = 16 * 1024 * 1024;
export const MAX_CIPHERTEXT_BYTES = 2 * 1024 * 1024;
export const NumericDomain = z.enum(['int', 'float']);
const Ciphertext = z.string().min(1).max(MAX_CIPHERTEXT_BYTES)
    .refine((s) => Buffer.byteLength(s) <= MAX_CIPHERTEXT_BYTES, 'ciphertext too large');
export const InputBundle = z.object({
    version: z.literal(1),
    keyId: z.string().min(1).max(128),
    inputs: z.array(z.object({ domain: NumericDomain, ciphertext: Ciphertext }).strict()).min(1).max(128),
}).strict();
export const ResultBundle = z.object({
    version: z.literal(1), keyId: z.string().min(1).max(128),
    resultId: z.string().regex(/^ct_[a-f0-9]{32}$/),
    domain: NumericDomain, ciphertext: Ciphertext,
    operation: z.enum(['add', 'sub', 'mul', 'div']),
}).strict();
const functionsByOp = {
    add: { int: 'AddCipherInt', float: 'AddCipherFloat' },
    sub: { int: 'SubstractCipherInt', float: 'SubstractCipherFloat' },
    mul: { int: 'MultiplyCipherInt', float: 'MultiplyCipherFloat' },
    div: { int: 'DivideCipherInt', float: 'DivideCipherFloat' },
};
const computeFunctions = new Set(Object.values(functionsByOp).flatMap((x) => Object.values(x)));
export function endpoint(value, owner = false) {
    const url = new URL(value);
    const loopback = ['127.0.0.1', '[::1]'].includes(url.hostname);
    if (owner && !loopback)
        throw new Error('Owner runtime must use a literal loopback address on the owner device');
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
        throw new Error('HTTPS is required outside loopback');
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/')
        throw new Error('Use an origin URL without credentials, path, query, or fragment');
    return url;
}
// No key loading, encryption, or decryption methods are exposed by this client.
export function computeClient(baseUrl, token, fetchImpl = fetch) {
    const base = endpoint(baseUrl).origin;
    const request = jsonTransport(base, token, fetchImpl);
    return {
        async health() {
            const checked = z.object({ status: z.literal('ok'), role: z.literal('compute'), secretKeyLoaded: z.literal(false), keyId: z.string().min(1).max(128) }).safeParse(await request('/health'));
            if (!checked.success)
                throw new Error('Worker must advertise a compute-only role without a loaded secret key');
            return checked.data;
        },
        async functions() {
            return z.object({ arity1: z.array(z.string()), arity2: z.array(z.string()), arity3: z.array(z.string()) }).parse(await request('/functions'));
        },
        async call(fn, ciphertexts) {
            if (!computeFunctions.has(fn) || ciphertexts.length !== 2)
                throw new Error('Unsupported ciphertext operation');
            ciphertexts.forEach((ct) => Ciphertext.parse(ct));
            return z.object({ result: Ciphertext }).parse(await request('/call', { fn, args: ciphertexts })).result;
        },
    };
}
export function jsonTransport(base, token, fetchImpl = fetch) {
    return async (path, body) => {
        const res = await fetchImpl(base + path, {
            method: body === undefined ? 'GET' : 'POST',
            headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
            body: body === undefined ? undefined : JSON.stringify(body),
            redirect: 'error', signal: AbortSignal.timeout(30_000),
        });
        // Do not echo backend response bodies into model context: they may contain sensitive diagnostics.
        if (!res.ok) {
            await res.body?.cancel();
            throw new Error(`Backend request failed (HTTP ${res.status})`);
        }
        if (!res.body)
            throw new Error('Empty backend response');
        const reader = res.body.getReader(), chunks = [];
        let size = 0;
        try {
            for (;;) {
                const { value, done } = await reader.read();
                if (done)
                    break;
                size += value.byteLength;
                if (size > MAX_BUNDLE_BYTES) {
                    await reader.cancel();
                    throw new Error('Backend response exceeds size limit');
                }
                chunks.push(value);
            }
        }
        finally {
            reader.releaseLock();
        }
        try {
            return JSON.parse(Buffer.concat(chunks).toString('utf8'));
        }
        catch {
            throw new Error('Invalid backend JSON');
        }
    };
}
export class SealedSession {
    worker;
    now;
    values = new Map();
    inputHandles = [];
    bytes = 0;
    active = false;
    keyId;
    constructor(worker, bundle, now = Date.now) {
        this.worker = worker;
        this.now = now;
        const checked = InputBundle.parse(bundle);
        if (Buffer.byteLength(JSON.stringify(checked)) > MAX_BUNDLE_BYTES)
            throw new Error('Input bundle exceeds size limit');
        this.keyId = checked.keyId;
        for (const input of checked.inputs)
            this.inputHandles.push(this.remember(input));
    }
    inputs() {
        return this.inputHandles.filter((handle) => this.values.has(handle)).map((handle, index) => ({ handle, index, domain: this.lookup(handle).domain }));
    }
    async status() {
        const health = await this.worker.health();
        return { mode: 'ciphertext-only', backendReachable: health.status === 'ok', cryptographyVerified: false, inputCount: this.inputHandles.length };
    }
    async ops() {
        const fns = new Set((await this.worker.functions()).arity2);
        return Object.entries(functionsByOp).map(([name, domains]) => ({ name, domains: Object.entries(domains).filter(([, fn]) => fns.has(fn)).map(([domain]) => domain) })).filter((op) => op.domains.length);
    }
    async compute(op, inputs) {
        if (!Object.hasOwn(functionsByOp, op))
            throw new Error('Unsupported operation');
        if (inputs.length < 2 || inputs.length > 128 || (['sub', 'div'].includes(op) && inputs.length !== 2))
            throw new Error('Invalid number of input handles');
        if (this.active)
            throw new Error('One computation at a time is supported in this preview');
        const values = inputs.map((handle) => this.lookup(handle));
        const domain = values[0].domain;
        if (values.some((value) => value.domain !== domain))
            throw new Error('All handles must have the same domain and key');
        if (this.values.size >= 512 || this.bytes + MAX_CIPHERTEXT_BYTES > 32 * 1024 * 1024)
            throw new Error('Session capacity reached; start a new session');
        this.active = true;
        try {
            const fn = functionsByOp[op][domain];
            if (!(await this.worker.functions()).arity2.includes(fn))
                throw new Error('Operation is not advertised by this worker');
            let ciphertext = values[0].ciphertext;
            for (const value of values.slice(1))
                ciphertext = Ciphertext.parse(await this.worker.call(fn, [ciphertext, value.ciphertext]));
            return { handle: this.remember({ domain, ciphertext, operation: op }), domain, operation: op };
        }
        finally {
            this.active = false;
        }
    }
    exportResult(handle) {
        const value = this.lookup(handle);
        if (!value.operation)
            throw new Error('Only computed results can be exported');
        return { version: 1, keyId: this.keyId, resultId: handle, domain: value.domain, ciphertext: value.ciphertext, operation: value.operation };
    }
    remember(value) {
        Ciphertext.parse(value.ciphertext);
        const handle = `ct_${randomBytes(16).toString('hex')}`;
        this.values.set(handle, { ...value, created: this.now() });
        this.bytes += Buffer.byteLength(value.ciphertext);
        return handle;
    }
    lookup(handle) {
        const value = this.values.get(handle);
        if (!value)
            throw new Error('Unknown handle in this owner session');
        if (this.now() - value.created >= 60 * 60 * 1000) {
            this.values.delete(handle);
            this.bytes -= Buffer.byteLength(value.ciphertext);
            throw new Error('Handle expired; prepare a new owner input bundle');
        }
        return value;
    }
}
