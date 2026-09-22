import * as z from 'zod/v4';
export const VERSION = '0.5.0-rc.2';
export const PROTOCOL = 'aura-coprocessor/1';
export const MAX_INPUTS = 128;
export const MAX_RESPONSE = 1024 * 1024;
export const OpaqueId = z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const Handle = z.string().regex(/^ct_[0-9a-f-]{36}$/);
export const Domain = z.enum(['int', 'float', 'string']);
export const Operation = z.enum(['add', 'sub', 'mul', 'mean', 'concat']);
export const KeyRef = z.strictObject({ id: OpaqueId, version: z.number().int().positive() });
export const Capability = z.strictObject({ op: Operation, domain: Domain,
    minInputs: z.number().int().min(1).max(MAX_INPUTS), maxInputs: z.number().int().min(1).max(MAX_INPUTS) });
export const SessionInfo = z.strictObject({ sessionId: OpaqueId, key: KeyRef,
    expiresAt: z.number().int().positive(), capabilities: z.array(Capability).max(32) });
export const ObjectRef = z.strictObject({ objectId: OpaqueId, domain: Domain, expiresAt: z.number().int().positive() });
export const Imported = z.strictObject({ sessionId: OpaqueId, key: KeyRef, objects: z.array(ObjectRef).min(1).max(MAX_INPUTS) });
export const Computed = z.strictObject({ sessionId: OpaqueId, key: KeyRef, object: ObjectRef });
export const Exported = z.strictObject({ sessionId: OpaqueId, key: KeyRef, resultId: OpaqueId, expiresAt: z.number().int().positive() });
export class AuraError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
export function sameKey(a, b) { return a.id === b.id && a.version === b.version; }
export function supported(c) {
    const ops = { int: ['add', 'sub', 'mul'], float: ['add', 'sub', 'mul', 'mean'], string: ['concat'] };
    const minimum = c.op === 'mean' ? 1 : 2;
    return ops[c.domain].includes(c.op) && c.minInputs >= minimum && c.maxInputs >= c.minInputs &&
        (c.op !== 'sub' || (c.minInputs === 2 && c.maxInputs === 2));
}
