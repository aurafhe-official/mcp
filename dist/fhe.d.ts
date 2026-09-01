export type Domain = 'int' | 'float' | 'string' | 'binary';
/** Genesis coprocessor — the hosted AURA network agents connect to by default. */
export declare const DEFAULT_COPROCESSOR_URL = "https://api.afhe.io:8443";
export interface Coprocessor {
    url?: string;
    health(): Promise<{
        status: string;
    }>;
    functions(): Promise<{
        arity1: string[];
        arity2: string[];
        arity3: string[];
    }>;
    encrypt(domain: Domain, value: string, pub?: boolean): Promise<string>;
    decrypt(domain: Domain, ciphertext: string): Promise<string>;
    call(fn: string, args: string[]): Promise<string>;
}
export interface HttpCoprocessor extends Coprocessor {
    connect(): Promise<void>;
}
export interface OpInfo {
    name: string;
    domains: Domain[];
    arity: number;
    summary: string;
}
export declare function resolveOp(op: string, domain: Domain, _arity?: number): string;
export declare class FheSession {
    private readonly fhe;
    private store;
    private n;
    constructor(fhe: Coprocessor);
    ops(): OpInfo[];
    status(): Promise<{
        ok: boolean;
        network: string;
        coprocessor: string;
        handles: number;
        ops: OpInfo[];
    }>;
    encrypt(domain: Domain, value: string | number, opts?: {
        public?: boolean;
        raw?: boolean;
    }): Promise<{
        handle: string;
        domain: Domain;
        ciphertext: string | undefined;
    }>;
    decrypt(handle: string): Promise<{
        plaintext: string;
        domain: Domain;
        handle: string;
    }>;
    compute(opts: {
        op: string;
        domain: Domain;
        inputs: Array<string | number>;
        reveal?: boolean;
        raw?: boolean;
    }): Promise<{
        handle: string;
        domain: Domain;
        op: string;
        plaintext: string | undefined;
        ciphertext: string | undefined;
    }>;
    privateEval(opts: {
        domain: Domain;
        op: string;
        values: Array<string | number>;
        reveal?: boolean;
        raw?: boolean;
        sealedInputs?: boolean;
    }): Promise<{
        handle: string;
        domain: Domain;
        op: string;
        plaintext: string | undefined;
        ciphertext: string | undefined;
    }>;
    private sealInput;
    private fold;
    private finish;
    private remember;
    private lookup;
}
export interface HttpCoprocessorOptions {
    baseUrl: string;
    fetch?: typeof fetch;
    apiKey?: string;
    autoLoad?: boolean;
    timeoutMs?: number;
    insecureTLS?: boolean;
    keys?: {
        skb?: string;
        pkb?: string;
        dictb?: string;
    };
}
export declare function createHttpCoprocessor(opts: HttpCoprocessorOptions): HttpCoprocessor;
export declare function envCoprocessor(): HttpCoprocessor;
