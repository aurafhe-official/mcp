/** Public teaching text only. No encryption, decryption or user data belongs here. */
export const DEMO_PROMPT = 'I am new to FHE. Show me the Aura demo and explain each step in simple language. Use the public sample numbers, perform the calculation, save the encrypted result, and explain what actually happened. Do not ask me to create keys or enter private data.';
export const HOST_GUIDANCE = [
    'Treat a first-time visitor as someone who has never heard of FHE.',
    'When the user asks to start, try Aura, or see a demo, call aura_start first.',
    'Speak in the user\'s language. Explain FHE once as computing with encrypted data, and ciphertext as the encrypted form of a value.',
    'Use guide.message and guide.whyItMatters to narrate each stage. Keep handles, tool names and JSON out of the explanation unless requested.',
    'For an authorized public demo, follow guide.nextAction through preparation, calculation and saving, narrating each step without asking the user to operate tools or load keys.',
    'Do not run the demo merely because the MCP connected. Host approval controls still apply. Pause if the user asks for questions or one step at a time.',
    'Only report a step complete after its tool succeeds. If a call fails, explain help.message and help.nextStep; do not invent a result or automatically repeat a failed computation.',
    'Public sample values and the expected sum 42 are teaching examples, not decrypted observations. Never say 42 was returned or verified by the MCP.',
    'End with a short recap of preparation, remote encrypted calculation and saved encrypted result, then offer another example or an explanation.',
    'The demo is backend-keyed: Aura manages its example keys. Do not claim that the backend cannot decrypt these examples.',
    'Do not request private numbers, files, credentials or keys in chat. Do not portray a reference engine as Aura\'s engine.',
].join(' ');
export function welcomeGuide(demo, configured, additionAvailable) {
    if (!demo)
        return {
            title: 'Welcome to Aura',
            message: 'FHE means fully homomorphic encryption: doing calculations with data while it is encrypted. MCP lets your assistant ask Aura to do those calculations.',
            nextStep: configured ? 'Your operator has supplied encrypted data. Ask them which calculation and recipient workflow to use; the public sample tour is a separate mode.'
                : 'Enable the public sample tour: run aura-fhe-mcp --config cursor --demo (use claude or vscode for your app), update the Aura connection and reconnect. Then say: Show me the Aura demo.',
            needsPrivateData: false,
        };
    return {
        step: 1, totalSteps: 4, title: 'Meet encrypted computing',
        message: 'FHE means fully homomorphic encryption. It lets a service calculate with data in its encrypted form. Think of numbers inside locked boxes that can still be combined into a new locked result.',
        whyItMatters: 'Encryption usually protects data while it is stored or sent. FHE lets us also work with its encrypted form. Your assistant connects to Aura to request that work.',
        sample: { story: 'Two shops have public example totals of 25 and 17. We will combine their encrypted totals.', values: [25, 17], expectedSum: 42, expectedSumIsNotAnObservedResult: true },
        modeNote: 'This tour uses public sample data and keys managed by Aura (backend-keyed). You do not need to create or load keys. This is a learning demo, not a place for private business data.',
        steps: ['Understand the example', 'Prepare encrypted samples', 'Calculate with the encrypted samples', 'Save and understand the encrypted result'],
        ...(additionAvailable ? { nextAction: { tool: 'fhe_inputs', arguments: {} } }
            : { nextStep: 'The service is connected but does not currently offer the sample addition. Explain that the tour cannot run yet; offer to check again later.' }),
    };
}
export function preparedGuide(inputs) {
    const a = inputs.find(i => i.index === 0), b = inputs.find(i => i.index === 1);
    if (!a || !b)
        return { title: 'Start a fresh demo', message: 'The sample references have expired or were forgotten. Reconnect Aura to prepare fresh encrypted examples.' };
    return { step: 2, totalSteps: 4, title: 'Encrypted samples are ready',
        message: 'Aura prepared encrypted versions of the public example numbers. Your assistant received references it can use to request a calculation.',
        whyItMatters: 'A reference is just a label for an encrypted value. You do not need to copy it, understand it or manage keys.',
        nextAction: { tool: 'fhe_compute', arguments: { op: 'add', handles: [a.handle, b.handle] } } };
}
export function computedGuide(handle) {
    return { step: 3, totalSteps: 4, title: 'The encrypted calculation returned',
        message: 'Aura returned an encrypted result. Your assistant can save it without turning it into a readable number.',
        whyItMatters: 'Computing and reading are separate steps. A successful response gives us an encrypted result; checking its numerical value requires a separate verification step.',
        nextAction: { tool: 'fhe_export', arguments: { handle } } };
}
export function savedGuide() {
    return { step: 4, totalSteps: 4, title: 'Your encrypted result is saved',
        message: 'You completed the sample workflow: prepare encrypted data, request a calculation on Aura, and save the encrypted result.',
        whyItMatters: 'The saved file contains encrypted data, not a readable answer. For the first example, 25 + 17 is expected to be 42; this MCP tour has not decrypted or verified that answer.',
        observed: ['The service returned an encrypted result.', 'The encrypted result was written to the configured results folder.'],
        nextChoices: ['Explain how encrypted computation works', 'Try a sum or average using the other public samples', 'Show the verification evidence', 'Discuss an application with Aura'],
        resultReading: 'In an owner-controlled deployment, an authorized recipient decrypts with their own key. This public demo uses backend-managed keys and a separate synthetic verifier.',
    };
}
export function errorHelp(code) {
    if (code === 'UNKNOWN_OR_EXPIRED_HANDLE')
        return { message: 'That encrypted reference is no longer available.', nextStep: 'Reconnect Aura to start a fresh demo. Saved result files are retained.' };
    if (code === 'INPUT_BUNDLE_REQUIRED_OR_USE_DEMO')
        return { message: 'The public sample tour is not enabled on this connection.', nextStep: 'Generate your app settings with --demo, update its Aura connection and reconnect. Do not paste private data into chat.' };
    if (code === 'OPERATION_UNAVAILABLE')
        return { message: 'The connected service does not offer that calculation right now.', nextStep: 'Check the available operations and choose one of those examples.' };
    if (code === 'BUSY' || code.includes('RATE_LIMIT'))
        return { message: 'Aura is busy with another request.', nextStep: 'Wait for it to finish before trying again.' };
    if (code === 'COMPUTE_ONLY_KEY_SCOPE_REQUIRED')
        return { message: 'The configured worker does not match this encrypted input setup.', nextStep: 'Ask your operator to check the worker and key configuration. Use a separate --demo connection for public examples.' };
    if (code === 'CANCELLED')
        return { message: 'The request was cancelled.', nextStep: 'No completion is claimed. Continue only when you are ready.' };
    if (code === 'DOMAIN_MISMATCH' || code === 'INVALID_OPERATION')
        return { message: 'Those inputs cannot be combined in that way.', nextStep: 'Use the supplied sample steps, with two integer examples for the first addition.' };
    return { message: 'Aura could not finish this step.', nextStep: 'Check the Aura connection and try again when ready. Keep connection security enabled; do not share credentials in chat.' };
}
