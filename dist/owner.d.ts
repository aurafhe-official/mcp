import { InputBundle, ResultBundle, type NumericDomain } from './sealed.js';
export declare function ownerClient(ownerUrl: string, workerUrl: string, keyId: string, token?: string, fetchImpl?: typeof fetch): {
    prepare(domain: NumericDomain, values: Array<string | number>): Promise<InputBundle>;
    decrypt(value: ResultBundle): Promise<string>;
};
