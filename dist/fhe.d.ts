import { KeyRef, type Operation } from './contracts.js';
import type { Coprocessor } from './coprocessor.js';
/** Local handles conceal remote object references. All computation is remote. */
export declare class FheSession {
    private remote;
    private key;
    private now;
    private session?;
    private handles;
    private busy;
    private calls;
    constructor(remote: Coprocessor, key: KeyRef, now?: () => number);
    private exclusive;
    private ensure;
    private purge;
    private scope;
    private validateRefs;
    private remember;
    private lookup;
    status(signal?: AbortSignal): Promise<{
        ready: boolean;
        execution: string;
        expiresAt: number;
    }>;
    ops(signal?: AbortSignal): Promise<{
        ops: {
            op: "add" | "sub" | "mul" | "mean" | "concat";
            domain: "string" | "int" | "float";
            minInputs: number;
            maxInputs: number;
        }[];
    }>;
    importDataset(datasetId: string, signal?: AbortSignal): Promise<{
        handles: {
            handle: string;
            domain: "string" | "int" | "float";
            expiresAt: number;
        }[];
    }>;
    compute(op: Operation, handles: string[], signal?: AbortSignal): Promise<{
        handle: string;
        domain: "string" | "int" | "float";
        expiresAt: number;
    }>;
    exportResult(handle: string, signal?: AbortSignal): Promise<{
        resultId: string;
        domain: "string" | "int" | "float";
        expiresAt: number;
    }>;
    release(handles: string[], signal?: AbortSignal): Promise<{
        released: number;
    }>;
}
