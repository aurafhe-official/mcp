export type Action = 'session.open' | 'session.status' | 'dataset.import' | 'compute' | 'result.export' | 'objects.release';
export interface Coprocessor {
    request(action: Action, payload: object, signal?: AbortSignal): Promise<unknown>;
}
export type Options = {
    endpoint: string;
    token: string;
    timeoutMs?: number;
    fetch?: typeof fetch;
};
/** Public transport only. No engine bindings, key files, encryption or native dispatch. */
export declare class HttpsCoprocessor implements Coprocessor {
    private options;
    private endpoint;
    private fetchImpl;
    private timeoutMs;
    constructor(options: Options);
    request(action: Action, payload: object, signal?: AbortSignal): Promise<unknown>;
}
export declare function configuredCoprocessor(): {
    coprocessor: HttpsCoprocessor;
    key: {
        id: string;
        version: number;
    };
};
