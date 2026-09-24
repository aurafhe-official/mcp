import * as z from 'zod/v4';
export const VERSION = '0.5.0-rc.7';
export const DEFAULT_ENDPOINT = 'https://api.afhe.io:8443';
export const MAX_INPUTS = 128;
export const MAX_RESPONSE = 4 * 1024 * 1024;
export const MAX_BUNDLE = 16 * 1024 * 1024;
export const MAX_CIPHERTEXT = 2 * 1024 * 1024;
export const Handle = z.string().regex(/^ct_[0-9a-f]{32}$/);
export const Domain = z.enum(['int', 'float']);
export const Operation = z.enum(['add', 'sub', 'mul', 'div']);
export const Ciphertext = z.string().min(1).max(MAX_CIPHERTEXT)
    .refine(value => Buffer.byteLength(value) <= MAX_CIPHERTEXT);
export const InputBundle = z.strictObject({ version: z.literal(1), keyId: z.string().min(1).max(128),
    inputs: z.array(z.strictObject({ domain: Domain, ciphertext: Ciphertext })).min(1).max(MAX_INPUTS) });
export const ResultBundle = z.strictObject({ version: z.literal(1), keyId: z.string().min(1).max(128),
    resultId: Handle, domain: Domain, ciphertext: Ciphertext, operation: Operation });
export class AuraError extends Error {
    code;
    constructor(code) {
        super(code);
        this.code = code;
    }
}
// Already-public HTTP API names, without engine implementation or parameters.
export const FUNCTIONS = {
    add: { int: 'AddCipherInt', float: 'AddCipherFloat' },
    sub: { int: 'SubstractCipherInt', float: 'SubstractCipherFloat' },
    mul: { int: 'MultiplyCipherInt', float: 'MultiplyCipherFloat' },
    div: { int: 'DivideCipherInt', float: 'DivideCipherFloat' },
};
export const FunctionList = z.object({ arity1: z.array(z.string().max(128)).max(256),
    arity2: z.array(z.string().max(128)).max(256), arity3: z.array(z.string().max(128)).max(256) });
