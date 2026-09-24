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
    context(): {
        mode: string;
        keyCustodyModel: string;
        confidentialityClaimed: boolean;
        confidentialityVerified: boolean;
        productionReady: boolean;
    };
    roadmap(): {
        foundation: string;
        availableThroughMcp: string[];
        compositions: string[];
        nextRelease: {
            status: string;
            capability: string;
        };
        requiresSeparateIntegration: string[];
        completedApplications: {
            applications: string[];
            status: string;
            availability: string;
            source: string;
            exposedThroughDemoMcp: boolean;
        };
        productionPattern: string;
        verifiedMode: {
            status: string;
            evidenceRequired: string[];
        };
        openSource: {
            available: string[];
            notIncluded: string[];
            furtherDisclosures: string;
        };
        contact: string;
    };
    proof(): {
        scope: string;
        keyCustody: {
            status: string;
            explanation: string;
        };
        serverZeroDecryption: {
            status: string;
        };
        independentCryptographicReview: {
            status: string;
        };
        networkJournal: {
            status: string;
        };
        correctness: {
            status: string;
            command: string;
            explanation: string;
        };
    };
    start(signal?: AbortSignal): Promise<{
        readThisFirst: {
            purpose: string;
            demo: string;
            production: string;
            openSource: string;
        };
        nextSteps: string[];
        smokeTest: {
            status: string;
            explanation: string;
        };
        ops: {
            op: string;
            domain: string;
            minInputs: number;
            maxInputs: number;
        }[];
        backendReachable: boolean;
        execution: string;
        inputsConfigured: boolean;
        productionReady: boolean;
        confidentialityVerified: boolean;
        mode: string;
        keyCustodyModel: string;
        confidentialityClaimed: boolean;
    }>;
    private exclusive;
    private purge;
    private remember;
    private lookup;
    status(signal?: AbortSignal): Promise<{
        backendReachable: boolean;
        execution: string;
        inputsConfigured: boolean;
        productionReady: boolean;
        confidentialityVerified: boolean;
        mode: string;
        keyCustodyModel: string;
        confidentialityClaimed: boolean;
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
        metrics: {
            clientElapsedMs: number;
            ciphertextBytes: number;
            remoteComputeCalls: number;
            timingScope: string;
            precisionClass: string;
            accuracyVerified: boolean;
        };
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
