import { randomUUID } from 'node:crypto';
import * as z from 'zod/v4';
import { AuraError, Computed, Exported, Imported, KeyRef, MAX_INPUTS, OpaqueId, SessionInfo, sameKey, supported } from './contracts.js';
/** Local handles conceal remote object references. All computation is remote. */
export class FheSession {
    remote;
    key;
    now;
    session;
    handles = new Map();
    busy = false;
    calls = [];
    constructor(remote, key, now = () => Date.now()) {
        this.remote = remote;
        this.key = key;
        this.now = now;
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
            return await fn();
        }
        finally {
            this.busy = false;
        }
    }
    async ensure(signal) {
        if (this.session && this.session.expiresAt <= this.now()) {
            this.handles.clear();
            throw new AuraError('SESSION_EXPIRED_RECONNECT');
        }
        if (!this.session) {
            const session = SessionInfo.parse(await this.remote.request('session.open', { key: this.key }, signal));
            if (!sameKey(session.key, this.key) || session.expiresAt <= this.now() || session.expiresAt > this.now() + 24 * 60 * 60_000 || session.capabilities.some(c => !supported(c)))
                throw new AuraError('INVALID_COPROCESSOR_SESSION');
            if (new Set(session.capabilities.map(c => `${c.domain}/${c.op}`)).size !== session.capabilities.length)
                throw new AuraError('INVALID_COPROCESSOR_SESSION');
            this.session = session;
        }
        this.purge();
        return { sessionId: this.session.sessionId, key: this.key };
    }
    purge() { for (const [h, ref] of this.handles)
        if (ref.expiresAt <= this.now())
            this.handles.delete(h); }
    scope(value) {
        if (value.sessionId !== this.session?.sessionId || !sameKey(value.key, this.key))
            throw new AuraError('COPROCESSOR_SCOPE_MISMATCH');
    }
    validateRefs(refs) {
        if (refs.some(r => r.expiresAt <= this.now() || r.expiresAt > this.session.expiresAt))
            throw new AuraError('INVALID_OBJECT_EXPIRY');
        if (this.handles.size + refs.length > 2048)
            throw new AuraError('HANDLE_LIMIT');
    }
    remember(ref) {
        const handle = `ct_${randomUUID()}`;
        const expiresAt = Math.min(ref.expiresAt, this.now() + 30 * 60_000);
        this.handles.set(handle, { ...ref, expiresAt });
        return { handle, domain: ref.domain, expiresAt };
    }
    lookup(handle) {
        const ref = this.handles.get(handle);
        if (!ref || ref.expiresAt <= this.now())
            throw new AuraError('UNKNOWN_OR_EXPIRED_HANDLE');
        return ref;
    }
    async status(signal) {
        return this.exclusive(async () => {
            const scope = await this.ensure(signal);
            const status = z.strictObject({ sessionId: OpaqueId, key: KeyRef, ready: z.boolean() })
                .parse(await this.remote.request('session.status', scope, signal));
            this.scope(status);
            return { ready: status.ready, execution: 'aura-coprocessor', expiresAt: this.session.expiresAt };
        });
    }
    async ops(signal) {
        return this.exclusive(async () => { await this.ensure(signal); return { ops: this.session.capabilities }; });
    }
    async importDataset(datasetId, signal) {
        OpaqueId.parse(datasetId);
        return this.exclusive(async () => {
            const scope = await this.ensure(signal);
            const imported = Imported.parse(await this.remote.request('dataset.import', { ...scope, datasetId }, signal));
            this.scope(imported);
            this.validateRefs(imported.objects);
            if (signal?.aborted)
                throw new AuraError('CANCELLED');
            return { handles: imported.objects.map(ref => this.remember(ref)) };
        });
    }
    async compute(op, handles, signal) {
        return this.exclusive(async () => {
            const scope = await this.ensure(signal);
            if (!handles.length || handles.length > MAX_INPUTS)
                throw new AuraError('INVALID_OPERATION');
            const refs = handles.map(h => this.lookup(h));
            const domain = refs[0].domain;
            if (refs.some(r => r.domain !== domain))
                throw new AuraError('DOMAIN_MISMATCH');
            const cap = this.session.capabilities.find(c => c.domain === domain && c.op === op);
            if (!cap || handles.length < cap.minInputs || handles.length > cap.maxInputs)
                throw new AuraError('INVALID_OPERATION');
            if (this.handles.size >= 2048)
                throw new AuraError('HANDLE_LIMIT');
            const result = Computed.parse(await this.remote.request('compute', { ...scope, op, domain, objectIds: refs.map(r => r.objectId) }, signal));
            this.scope(result);
            this.validateRefs([result.object]);
            if (result.object.domain !== domain)
                throw new AuraError('INVALID_RESULT_DOMAIN');
            if (signal?.aborted)
                throw new AuraError('CANCELLED');
            const expiresAt = Math.min(result.object.expiresAt, ...refs.map(r => r.expiresAt));
            if (expiresAt <= this.now())
                throw new AuraError('UNKNOWN_OR_EXPIRED_HANDLE');
            return this.remember({ ...result.object, expiresAt });
        });
    }
    async exportResult(handle, signal) {
        return this.exclusive(async () => {
            const scope = await this.ensure(signal);
            const ref = this.lookup(handle);
            const result = Exported.parse(await this.remote.request('result.export', { ...scope, objectId: ref.objectId, expiresAt: ref.expiresAt }, signal));
            this.scope(result);
            if (result.expiresAt <= this.now() || result.expiresAt > Math.min(this.session.expiresAt, ref.expiresAt))
                throw new AuraError('INVALID_RESULT_EXPIRY');
            return { resultId: result.resultId, domain: ref.domain, expiresAt: result.expiresAt };
        });
    }
    async release(handles, signal) {
        return this.exclusive(async () => {
            const scope = await this.ensure(signal);
            const unique = [...new Set(handles)];
            const refs = unique.map(h => this.lookup(h));
            const result = z.strictObject({ sessionId: OpaqueId, key: KeyRef, released: z.number().int().nonnegative() })
                .parse(await this.remote.request('objects.release', { ...scope, objectIds: refs.map(r => r.objectId) }, signal));
            this.scope(result);
            if (result.released !== refs.length)
                throw new AuraError('INVALID_RELEASE_RESULT');
            for (const h of unique)
                this.handles.delete(h);
            return { released: result.released };
        });
    }
}
