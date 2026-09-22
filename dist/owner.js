// This module is for a trusted owner application. It is never registered as an MCP tool.
import * as z from 'zod/v4';
import { endpoint, jsonTransport, InputBundle, ResultBundle, MAX_CIPHERTEXT_BYTES } from './sealed.js';
export function ownerClient(ownerUrl, workerUrl, keyId, token, fetchImpl = fetch) {
    const owner = endpoint(ownerUrl, true), worker = endpoint(workerUrl);
    if (owner.origin === worker.origin)
        throw new Error('Owner and compute runtime must be distinct origins and isolated processes');
    if (!keyId || keyId.length > 128)
        throw new Error('A configured key identifier is required');
    const request = jsonTransport(owner.origin, token, fetchImpl);
    async function checkOwner() {
        const checked = z.object({ status: z.literal('ok'), role: z.literal('owner'), secretKeyLoaded: z.literal(true), keyId: z.literal(keyId) }).safeParse(await request('/health'));
        if (!checked.success)
            throw new Error('Owner runtime role or key identifier does not match configuration');
    }
    return {
        async prepare(domain, values) {
            if (domain !== 'int' && domain !== 'float')
                throw new Error('Only int and float domains are supported');
            if (values.length < 1 || values.length > 128)
                throw new Error('Provide 1 to 128 values');
            // Reject invalid values before any plaintext is sent, even to the owner runtime.
            for (const value of values) {
                if (typeof value !== 'string' && typeof value !== 'number')
                    throw new Error('Invalid numeric input');
                if (typeof value === 'number' && (!Number.isFinite(value) || (domain === 'int' && !Number.isSafeInteger(value))))
                    throw new Error('Use decimal strings for large integers');
                if (domain === 'int' ? !/^-?\d+$/.test(String(value)) : !/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(value)))
                    throw new Error('Invalid numeric input');
                if (String(value).length > 4096)
                    throw new Error('Numeric input too long');
            }
            await checkOwner();
            const inputs = [];
            for (const value of values) {
                const response = z.object({ ciphertext: z.string().min(1).max(MAX_CIPHERTEXT_BYTES) }).parse(await request(`/encrypt/${domain}`, { value: String(value), public: false }));
                inputs.push({ domain, ciphertext: response.ciphertext });
            }
            return InputBundle.parse({ version: 1, keyId, inputs });
        },
        async decrypt(value) {
            const result = ResultBundle.parse(value);
            if (result.keyId !== keyId)
                throw new Error('Result belongs to a different key identifier');
            await checkOwner();
            return z.object({ plaintext: z.string() }).parse(await request(`/decrypt/${result.domain}`, { ciphertext: result.ciphertext })).plaintext;
        },
    };
}
