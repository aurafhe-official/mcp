import { open, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AuraError, InputBundle, MAX_BUNDLE, ResultBundle } from './contracts.js';
/** Paths come only from operator configuration, never MCP arguments. */
export async function readBundle(filename) {
    if (!path.isAbsolute(filename))
        throw new AuraError('ABSOLUTE_BUNDLE_PATH_REQUIRED');
    const file = await open(filename, 'r');
    try {
        if (!(await file.stat()).isFile())
            throw new AuraError('INVALID_INPUT_BUNDLE');
        const buffer = Buffer.alloc(MAX_BUNDLE + 1);
        let length = 0;
        while (length < buffer.length) {
            const { bytesRead } = await file.read(buffer, length, buffer.length - length, null);
            if (!bytesRead)
                break;
            length += bytesRead;
        }
        if (length > MAX_BUNDLE)
            throw new AuraError('INPUT_BUNDLE_LIMIT');
        return InputBundle.parse(JSON.parse(buffer.subarray(0, length).toString('utf8')));
    }
    finally {
        await file.close();
    }
}
export function resultWriter(directory) {
    if (!path.isAbsolute(directory))
        throw new AuraError('ABSOLUTE_RESULT_PATH_REQUIRED');
    return async (value) => {
        const result = ResultBundle.parse(value);
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await writeFile(path.join(directory, `${result.resultId}.json`), JSON.stringify(result), { flag: 'wx', mode: 0o600 });
    };
}
