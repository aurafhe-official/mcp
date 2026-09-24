import { randomBytes } from 'node:crypto';
import { AuraError, Ciphertext, FUNCTIONS, InputBundle, MAX_BUNDLE, MAX_INPUTS, Operation } from './contracts.js';
/** Session-local handles; ciphertext arithmetic always runs at the coprocessor. */
export class FheSession {
    remote;
    options;
    handles = new Map();
    inputHandles = [];
    keyId;
    loaded = false;
    busy = false;
    calls = [];
    now;
    constructor(remote, options) {
        this.remote = remote;
        this.options = options;
        this.now = options.now ?? Date.now;
        if (options.bundle && options.demo)
            throw new AuraError('DEMO_AND_BUNDLE_CONFLICT');
    }
    async exclusive(fn) {
        if (this.busy)
            throw new AuraError('BUSY');
        this.calls = this.calls.filter(t => t > this.now() - 60_000);
        if (this.calls.length >= 120)
            throw new AuraError('RATE_LIMIT');
        this.calls.push(this.now());
        this.busy = true;
        try {
            this.purge();
            return await fn();
        }
        finally {
            this.busy = false;
        }
    }
    purge() { for (const [h, ref] of this.handles)
        if (ref.expiresAt <= this.now())
            this.handles.delete(h); }
    remember(ref) {
        Ciphertext.parse(ref.ciphertext);
        if (this.handles.size >= 512 || [...this.handles.values()].reduce((n, r) => n + Buffer.byteLength(r.ciphertext), 0) + Buffer.byteLength(ref.ciphertext) > 32 * 1024 * 1024)
            throw new AuraError('HANDLE_LIMIT');
        const handle = `ct_${randomBytes(16).toString('hex')}`;
        this.handles.set(handle, ref);
        return { handle, domain: ref.domain, expiresAt: ref.expiresAt };
    }
    lookup(handle) {
        const ref = this.handles.get(handle);
        if (!ref || ref.expiresAt <= this.now())
            throw new AuraError('UNKNOWN_OR_EXPIRED_HANDLE');
        return ref;
    }
    async status(signal) {
        return this.exclusive(async () => {
            await this.remote.health(signal);
            return { backendReachable: true, execution: 'aura-coprocessor', mode: this.options.demo ? 'fixed-synthetic-demo' : 'ciphertext-only',
                inputsConfigured: Boolean(this.options.bundle || this.options.demo), productionReady: false, confidentialityVerified: false };
        });
    }
    async capabilities(signal) {
        const advertised = new Set((await this.remote.functions(signal)).arity2);
        return Object.entries(FUNCTIONS).flatMap(([op, domains]) => Object.entries(domains)
            .filter(([, fn]) => advertised.has(fn)).map(([domain]) => ({ op, domain, minInputs: 2, maxInputs: op === 'sub' || op === 'div' ? 2 : MAX_INPUTS })));
    }
    async ops(signal) { return this.exclusive(async () => ({ ops: await this.capabilities(signal) })); }
    async inputs(signal) {
        return this.exclusive(async () => {
            if (!this.loaded) {
                const source = this.options.bundle ?? await this.options.demo?.(signal);
                if (!source)
                    throw new AuraError('INPUT_BUNDLE_REQUIRED_OR_USE_DEMO');
                const bundle = InputBundle.parse(source);
                if (Buffer.byteLength(JSON.stringify(bundle)) > MAX_BUNDLE)
                    throw new AuraError('INPUT_BUNDLE_LIMIT');
                if (signal?.aborted)
                    throw new AuraError('CANCELLED');
                this.keyId = bundle.keyId;
                this.inputHandles = bundle.inputs.map(ref => this.remember({ ...ref, expiresAt: this.now() + 30 * 60_000 }).handle);
                this.loaded = true;
            }
            return { inputs: this.inputHandles.flatMap((handle, index) => {
                    const ref = this.handles.get(handle);
                    return ref ? [{ handle, index, domain: ref.domain, expiresAt: ref.expiresAt }] : [];
                }) };
        });
    }
    async compute(op, handles, signal) {
        return this.exclusive(async () => {
            Operation.parse(op);
            if (handles.length < 2 || handles.length > MAX_INPUTS || ((op === 'sub' || op === 'div') && handles.length !== 2))
                throw new AuraError('INVALID_OPERATION');
            const refs = handles.map(h => this.lookup(h)), domain = refs[0].domain;
            if (refs.some(r => r.domain !== domain))
                throw new AuraError('DOMAIN_MISMATCH');
            if (this.handles.size >= 512)
                throw new AuraError('HANDLE_LIMIT');
            const health = await this.remote.health(signal);
            if (!this.options.demo && (health.role !== 'compute' || health.secretKeyLoaded !== false || health.keyId !== this.keyId))
                throw new AuraError('COMPUTE_ONLY_KEY_SCOPE_REQUIRED');
            if (!(await this.capabilities(signal)).some(c => c.op === op && c.domain === domain))
                throw new AuraError('OPERATION_UNAVAILABLE');
            let ciphertext = refs[0].ciphertext;
            for (const ref of refs.slice(1)) {
                if (signal?.aborted)
                    throw new AuraError('CANCELLED');
                ciphertext = Ciphertext.parse(await this.remote.call(FUNCTIONS[op][domain], [ciphertext, ref.ciphertext], signal));
            }
            if (signal?.aborted)
                throw new AuraError('CANCELLED');
            const expiresAt = Math.min(...refs.map(ref => ref.expiresAt));
            if (expiresAt <= this.now())
                throw new AuraError('UNKNOWN_OR_EXPIRED_HANDLE');
            return this.remember({ domain, ciphertext, operation: op, expiresAt });
        });
    }
    async exportResult(handle) {
        return this.exclusive(async () => {
            const ref = this.lookup(handle);
            if (!ref.operation || !this.keyId)
                throw new AuraError('COMPUTED_RESULT_REQUIRED');
            const resultId = `ct_${randomBytes(16).toString('hex')}`;
            await this.options.writeResult({ version: 1, keyId: this.keyId, resultId, domain: ref.domain, ciphertext: ref.ciphertext, operation: ref.operation });
            return { resultId, domain: ref.domain, encrypted: true };
        });
    }
    async release(handles) {
        return this.exclusive(async () => {
            if (!handles.length || handles.length > MAX_INPUTS)
                throw new AuraError('INVALID_HANDLES');
            const unique = [...new Set(handles)];
            unique.forEach(h => this.lookup(h));
            unique.forEach(h => this.handles.delete(h));
            return { released: unique.length };
        });
    }
}
