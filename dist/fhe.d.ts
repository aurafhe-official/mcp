import { InputBundle, Operation, type ResultBundle } from './contracts.js';
import type { Coprocessor } from './coprocessor.js';
type Options = {
    bundle?: InputBundle;
    demo?: (signal?: AbortSignal) => Promise<InputBundle>;
    writeResult: (value: ResultBundle) => Promise<void>;
    now?: () => number;
};
/** Session-local handles; ciphertext arithmetic always runs at the coprocessor. */
export declare class FheSession {
    private remote;
    private options;
    private handles;
    private inputHandles;
    private keyId?;
    private loaded;
    private busy;
    private calls;
    private now;
    constructor(remote: Coprocessor, options: Options);
    private exclusive;
    private purge;
    private remember;
    private lookup;
    status(signal?: AbortSignal): Promise<{
        backendReachable: boolean;
        execution: string;
        mode: string;
        inputsConfigured: boolean;
        productionReady: boolean;
        confidentialityVerified: boolean;
    }>;
    private capabilities;
    ops(signal?: AbortSignal): Promise<{
        ops: {
            op: string;
            domain: string;
            minInputs: number;
            maxInputs: number;
        }[];
    }>;
    inputs(signal?: AbortSignal): Promise<{
        inputs: {
            handle: string;
            index: number;
            domain: "int" | "float";
            expiresAt: number;
        }[];
    }>;
    compute(op: Operation, handles: string[], signal?: AbortSignal): Promise<{
        handle: string;
        domain: "int" | "float";
        expiresAt: number;
    }>;
    exportResult(handle: string): Promise<{
        resultId: string;
        domain: "int" | "float";
        encrypted: boolean;
    }>;
    release(handles: string[]): Promise<{
        released: number;
    }>;
}
export {};
