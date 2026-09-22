import * as z from 'zod/v4';
export declare const VERSION = "0.5.0-rc.2";
export declare const PROTOCOL = "aura-coprocessor/1";
export declare const MAX_INPUTS = 128;
export declare const MAX_RESPONSE: number;
export declare const OpaqueId: z.ZodString;
export declare const Handle: z.ZodString;
export declare const Domain: z.ZodEnum<{
    string: "string";
    int: "int";
    float: "float";
}>;
export type Domain = z.infer<typeof Domain>;
export declare const Operation: z.ZodEnum<{
    add: "add";
    sub: "sub";
    mul: "mul";
    mean: "mean";
    concat: "concat";
}>;
export type Operation = z.infer<typeof Operation>;
export declare const KeyRef: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodNumber;
}, z.core.$strict>;
export type KeyRef = z.infer<typeof KeyRef>;
export declare const Capability: z.ZodObject<{
    op: z.ZodEnum<{
        add: "add";
        sub: "sub";
        mul: "mul";
        mean: "mean";
        concat: "concat";
    }>;
    domain: z.ZodEnum<{
        string: "string";
        int: "int";
        float: "float";
    }>;
    minInputs: z.ZodNumber;
    maxInputs: z.ZodNumber;
}, z.core.$strict>;
export type Capability = z.infer<typeof Capability>;
export declare const SessionInfo: z.ZodObject<{
    sessionId: z.ZodString;
    key: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNumber;
    }, z.core.$strict>;
    expiresAt: z.ZodNumber;
    capabilities: z.ZodArray<z.ZodObject<{
        op: z.ZodEnum<{
            add: "add";
            sub: "sub";
            mul: "mul";
            mean: "mean";
            concat: "concat";
        }>;
        domain: z.ZodEnum<{
            string: "string";
            int: "int";
            float: "float";
        }>;
        minInputs: z.ZodNumber;
        maxInputs: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type SessionInfo = z.infer<typeof SessionInfo>;
export declare const ObjectRef: z.ZodObject<{
    objectId: z.ZodString;
    domain: z.ZodEnum<{
        string: "string";
        int: "int";
        float: "float";
    }>;
    expiresAt: z.ZodNumber;
}, z.core.$strict>;
export type ObjectRef = z.infer<typeof ObjectRef>;
export declare const Imported: z.ZodObject<{
    sessionId: z.ZodString;
    key: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNumber;
    }, z.core.$strict>;
    objects: z.ZodArray<z.ZodObject<{
        objectId: z.ZodString;
        domain: z.ZodEnum<{
            string: "string";
            int: "int";
            float: "float";
        }>;
        expiresAt: z.ZodNumber;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const Computed: z.ZodObject<{
    sessionId: z.ZodString;
    key: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNumber;
    }, z.core.$strict>;
    object: z.ZodObject<{
        objectId: z.ZodString;
        domain: z.ZodEnum<{
            string: "string";
            int: "int";
            float: "float";
        }>;
        expiresAt: z.ZodNumber;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const Exported: z.ZodObject<{
    sessionId: z.ZodString;
    key: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodNumber;
    }, z.core.$strict>;
    resultId: z.ZodString;
    expiresAt: z.ZodNumber;
}, z.core.$strict>;
export declare class AuraError extends Error {
    readonly code: string;
    constructor(code: string);
}
export declare function sameKey(a: KeyRef, b: KeyRef): boolean;
export declare function supported(c: Capability): boolean;
