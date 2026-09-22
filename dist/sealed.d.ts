import * as z from 'zod/v4';
export declare const MAX_BUNDLE_BYTES: number;
export declare const MAX_CIPHERTEXT_BYTES: number;
export declare const NumericDomain: z.ZodEnum<{
    int: "int";
    float: "float";
}>;
export type NumericDomain = z.infer<typeof NumericDomain>;
export declare const InputBundle: z.ZodObject<{
    version: z.ZodLiteral<1>;
    keyId: z.ZodString;
    inputs: z.ZodArray<z.ZodObject<{
        domain: z.ZodEnum<{
            int: "int";
            float: "float";
        }>;
        ciphertext: z.ZodString;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type InputBundle = z.infer<typeof InputBundle>;
export declare const ResultBundle: z.ZodObject<{
    version: z.ZodLiteral<1>;
    keyId: z.ZodString;
    resultId: z.ZodString;
    domain: z.ZodEnum<{
        int: "int";
        float: "float";
    }>;
    ciphertext: z.ZodString;
    operation: z.ZodEnum<{
        add: "add";
        sub: "sub";
        mul: "mul";
        div: "div";
    }>;
}, z.core.$strict>;
export type ResultBundle = z.infer<typeof ResultBundle>;
export type Operation = ResultBundle['operation'];
export type ComputeClient = {
    health(): Promise<{
        status: string;
        keyId?: string;
    }>;
    functions(): Promise<{
        arity1: string[];
        arity2: string[];
        arity3: string[];
    }>;
    call(fn: string, ciphertexts: string[]): Promise<string>;
};
export declare function endpoint(value: string, owner?: boolean): URL;
export declare function computeClient(baseUrl: string, token?: string, fetchImpl?: typeof fetch): ComputeClient;
export declare function jsonTransport(base: string, token?: string, fetchImpl?: typeof fetch): (path: string, body?: unknown) => Promise<unknown>;
export declare class SealedSession {
    private readonly worker;
    private readonly now;
    private readonly values;
    private readonly inputHandles;
    private bytes;
    private active;
    private readonly keyId;
    constructor(worker: ComputeClient, bundle: InputBundle, now?: () => number);
    inputs(): {
        handle: string;
        index: number;
        domain: "int" | "float";
    }[];
    status(): Promise<{
        mode: string;
        backendReachable: boolean;
        cryptographyVerified: boolean;
        inputCount: number;
    }>;
    ops(): Promise<{
        name: string;
        domains: string[];
    }[]>;
    compute(op: Operation, inputs: string[]): Promise<{
        handle: string;
        domain: "int" | "float";
        operation: "add" | "sub" | "mul" | "div";
    }>;
    exportResult(handle: string): ResultBundle;
    private remember;
    private lookup;
}
