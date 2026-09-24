import * as z from 'zod/v4';
import { FunctionList } from './contracts.js';
export declare const Health: z.ZodObject<{
    status: z.ZodLiteral<"ok">;
    role: z.ZodOptional<z.ZodString>;
    secretKeyLoaded: z.ZodOptional<z.ZodBoolean>;
    keyId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export interface Coprocessor {
    health(signal?: AbortSignal): Promise<z.infer<typeof Health>>;
    functions(signal?: AbortSignal): Promise<z.infer<typeof FunctionList>>;
    call(fn: string, ciphertexts: string[], signal?: AbortSignal): Promise<string>;
}
export type Options = {
    endpoint?: string;
    token?: string;
    timeoutMs?: number;
    fetch?: typeof fetch;
};
/** Verified HTTPS transport; no backend diagnostics are returned to the model. */
export declare class HttpsCoprocessor implements Coprocessor {
    private options;
    private endpoint;
    private fetchImpl;
    private timeoutMs;
    constructor(options?: Options);
    private request;
    health(signal?: AbortSignal): Promise<{
        status: "ok";
        role?: string | undefined;
        secretKeyLoaded?: boolean | undefined;
        keyId?: string | undefined;
    }>;
    functions(signal?: AbortSignal): Promise<{
        arity1: string[];
        arity2: string[];
        arity3: string[];
    }>;
    call(fn: string, ciphertexts: string[], signal?: AbortSignal): Promise<string>;
    /** Fixed public numbers only; no caller-supplied plaintext enters this method. */
    demoBundle(signal?: AbortSignal): Promise<{
        version: 1;
        keyId: string;
        inputs: {
            domain: "int" | "float";
            ciphertext: string;
        }[];
    }>;
}
export declare function configuredCoprocessor(env?: NodeJS.ProcessEnv): HttpsCoprocessor;
