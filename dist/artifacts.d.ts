import { ResultBundle } from './contracts.js';
/** Paths come only from operator configuration, never MCP arguments. */
export declare function readBundle(filename: string): Promise<{
    version: 1;
    keyId: string;
    inputs: {
        domain: "int" | "float";
        ciphertext: string;
    }[];
}>;
export declare function resultWriter(directory: string): (value: ResultBundle) => Promise<void>;
