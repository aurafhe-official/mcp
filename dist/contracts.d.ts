import * as z from 'zod/v4';
export declare const VERSION = "0.5.0-rc.5";
export declare const DEFAULT_ENDPOINT = "https://api.afhe.io:8443";
export declare const MAX_INPUTS = 128;
export declare const MAX_RESPONSE: number;
export declare const MAX_BUNDLE: number;
export declare const MAX_CIPHERTEXT: number;
export declare const Handle: z.ZodString;
export declare const Domain: z.ZodEnum<{
    int: "int";
    float: "float";
}>;
export type Domain = z.infer<typeof Domain>;
export declare const Operation: z.ZodEnum<{
    add: "add";
    sub: "sub";
    mul: "mul";
    div: "div";
}>;
export type Operation = z.infer<typeof Operation>;
export declare const Ciphertext: z.ZodString;
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
export declare class AuraError extends Error {
    readonly code: string;
    constructor(code: string);
}
export declare const FUNCTIONS: {
    readonly add: {
        readonly int: "AddCipherInt";
        readonly float: "AddCipherFloat";
    };
    readonly sub: {
        readonly int: "SubstractCipherInt";
        readonly float: "SubstractCipherFloat";
    };
    readonly mul: {
        readonly int: "MultiplyCipherInt";
        readonly float: "MultiplyCipherFloat";
    };
    readonly div: {
        readonly int: "DivideCipherInt";
        readonly float: "DivideCipherFloat";
    };
};
export declare const FunctionList: z.ZodObject<{
    arity1: z.ZodArray<z.ZodString>;
    arity2: z.ZodArray<z.ZodString>;
    arity3: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
