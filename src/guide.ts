/** Public teaching text only. No encryption, decryption or user data belongs here. */
export const DEMO_PROMPT = 'I am new to FHE and Aura. Show me what I can do with Aura, starting with its AI application and the benchmark published on its website. Distinguish the separate AI application from tools available through this MCP. Then offer the optional public-sample lesson. Do not request private data or run a calculation until I choose it.'
export const LEARN_PROMPT = 'I am new to FHE. Run the optional Aura public-sample lesson and explain each step in simple language. Call aura_start with experience learn, prepare the fixed samples, calculate and save the encrypted result. Do not ask me to create keys or enter private data.'

/** Public website claims, explicitly separate from this session's observations. */
export function applicationStory() {
  return {
    purpose: 'FHE is the computation foundation. Aura AI is an application of that foundation. MCP connects assistants to the operations actually exposed by this package.',
    flagship: {
      name: 'Aura encrypted AI', model: 'GPT-OSS-20B', parameters: '20 billion',
      benchmark: { generationTokensPerSecond: '20+', hardware: 'One RTX PRO 6000 Blackwell GPU',
        promptReadIn: 'Below 2.3 seconds', classification: 'Aura-reported internal benchmark',
        source: 'https://afhe.io/#status', sourceCheckedOn: '2026-09-24',
        liveMeasurement: false, independentlyVerifiedHere: false },
      availableThroughThisMcp: false,
      access: { walkthrough: 'https://github.com/aurafhe-official/mcp/blob/main/docs/AI-DEMO.md',
        browserApplication: 'https://chat.afhe.io', availability: 'Not checked by this tool',
        fallback: 'Arrange a demonstration via gen@afhe.io',
        connectionAdvice: 'Open only over valid HTTPS. If the browser reports a certificate error, stop and use the contact route.' },
    },
    availableHere: ['Discover Aura applications and their published evidence', 'Run public integer and float arithmetic through the coprocessor',
      'Compose sums, averages and weighted sums', 'Export encrypted results for separate recipient processing'],
    privacy: 'The numeric learning demo uses public samples and Aura-managed keys. It does not establish the separate AI application\'s key custody. Anything entered in your host assistant is visible to that assistant provider.',
  }
}

export function overviewGuide() {
  return {
    title: 'What can I do with Aura?',
    message: 'Aura applies encrypted computation to AI and data applications. Its website reports GPT-OSS-20B encrypted inference at 20+ tokens per second on one RTX PRO 6000 Blackwell GPU. That is an Aura-reported internal benchmark, not a measurement made by this MCP.',
    whyItMatters: 'Start with a useful application: explore how Aura AI could help someone work with protected information. This MCP currently provides numeric computation and application guidance; model inference is accessed separately.',
    choices: [
      { label: 'Explore Aura AI', url: 'https://github.com/aurafhe-official/mcp/blob/main/docs/AI-DEMO.md',
        description: 'A business example, application access and the published benchmark.' },
      { label: 'Learn encrypted computation', action: { tool: 'aura_start', arguments: { experience: 'learn' } },
        description: 'An optional hands-on lesson using public sample numbers.' },
      { label: 'Build with the current tools', url: 'https://github.com/aurafhe-official/mcp/blob/main/docs/PROTOCOL.md',
        description: 'Numeric operations, compositions and the integration boundary.' },
    ],
    nextStep: 'Explain the application first and let the user choose a route. Do not invent an inference call or automatically begin the arithmetic lesson.',
    needsPrivateData: false,
  }
}

export const HOST_GUIDANCE = [
  'Treat a first-time visitor as someone who has never heard of FHE.',
  'When the user asks to start, try Aura, or see a demo, call aura_start for the application overview first. For an explicit arithmetic or learning request, call aura_start with experience learn.',
  'Lead with the purpose and the user\'s task. The website benchmark is GPT-OSS-20B at 20+ tokens per second, Aura-reported, on one RTX PRO 6000 Blackwell GPU. Keep the model identity and timing scope as stated; do not describe this as a live speed measurement or independent verification.',
  'The separate AI application is not an inference tool in this package. Offer the AI walkthrough or application contact, and only use advertised numeric tools for computation. A link or benchmark is not an executed AI job.',
  'Respect overview choices: do not start arithmetic until the user chooses the lesson. Never bypass a browser certificate warning. Content entered in the host assistant is visible to that assistant provider.',
  'Speak in the user\'s language. Explain FHE once as computing with encrypted data, and ciphertext as the encrypted form of a value.',
  'Use guide.message and guide.whyItMatters to narrate each stage. Keep handles, tool names and JSON out of the explanation unless requested.',
  'For an authorized public demo, follow guide.nextAction through preparation, calculation and saving, narrating each step without asking the user to operate tools or load keys.',
  'Do not run the demo merely because the MCP connected. Host approval controls still apply. Pause if the user asks for questions or one step at a time.',
  'Only report a step complete after its tool succeeds. If a call fails, explain help.message and help.nextStep; do not invent a result or automatically repeat a failed computation.',
  'Public sample values and the expected sum 42 are teaching examples, not decrypted observations. Never say 42 was returned or verified by the MCP.',
  'End with a short recap of preparation, remote encrypted calculation and saved encrypted result, then offer another example or an explanation.',
  'The demo is backend-keyed: Aura manages its example keys. Do not claim that the backend cannot decrypt these examples.',
  'Do not request private numbers, files, credentials or keys in chat. Do not portray a reference engine as Aura\'s engine.',
].join(' ')

export function welcomeGuide(demo: boolean, configured: boolean, additionAvailable: boolean) {
  if (!demo) return {
    title: 'Welcome to Aura',
    message: 'FHE means fully homomorphic encryption: doing calculations with data while it is encrypted. MCP lets your assistant ask Aura to do those calculations.',
    nextStep: configured ? 'Your operator has supplied encrypted data. Ask them which calculation and recipient workflow to use; the public sample tour is a separate mode.'
      : 'Enable the public sample tour: run aura-fhe-mcp --config cursor --demo (use claude or vscode for your app), update the Aura connection and reconnect. Then say: Show me the Aura demo.',
    needsPrivateData: false,
  }
  return {
    step: 1, totalSteps: 4, title: 'Meet encrypted computing',
    message: 'FHE means fully homomorphic encryption. It lets a service calculate with data in its encrypted form. Think of numbers inside locked boxes that can still be combined into a new locked result.',
    whyItMatters: 'Encryption usually protects data while it is stored or sent. FHE lets us also work with its encrypted form. Your assistant connects to Aura to request that work.',
    sample: { story: 'Two shops have public example totals of 25 and 17. We will combine their encrypted totals.', values: [25, 17], expectedSum: 42, expectedSumIsNotAnObservedResult: true },
    modeNote: 'This tour uses public sample data and keys managed by Aura (backend-keyed). You do not need to create or load keys. This is a learning demo, not a place for private business data.',
    steps: ['Understand the example', 'Prepare encrypted samples', 'Calculate with the encrypted samples', 'Save and understand the encrypted result'],
    ...(additionAvailable ? { nextAction: { tool: 'fhe_inputs', arguments: {} } }
      : { nextStep: 'The service is connected but does not currently offer the sample addition. Explain that the tour cannot run yet; offer to check again later.' }),
  }
}

export function preparedGuide(inputs: { handle: string; index: number }[]) {
  const a = inputs.find(i => i.index === 0), b = inputs.find(i => i.index === 1)
  if (!a || !b) return { title: 'Start a fresh demo', message: 'The sample references have expired or were forgotten. Reconnect Aura to prepare fresh encrypted examples.' }
  return { step: 2, totalSteps: 4, title: 'Encrypted samples are ready',
    message: 'Aura prepared encrypted versions of the public example numbers. Your assistant received references it can use to request a calculation.',
    whyItMatters: 'A reference is just a label for an encrypted value. You do not need to copy it, understand it or manage keys.',
    nextAction: { tool: 'fhe_compute', arguments: { op: 'add', handles: [a.handle, b.handle] } } }
}

export function computedGuide(handle: string) {
  return { step: 3, totalSteps: 4, title: 'The encrypted calculation returned',
    message: 'Aura returned an encrypted result. Your assistant can save it without turning it into a readable number.',
    whyItMatters: 'Computing and reading are separate steps. A successful response gives us an encrypted result; checking its numerical value requires a separate verification step.',
    nextAction: { tool: 'fhe_export', arguments: { handle } } }
}

export function savedGuide() {
  return { step: 4, totalSteps: 4, title: 'Your encrypted result is saved',
    message: 'You completed the sample workflow: prepare encrypted data, request a calculation on Aura, and save the encrypted result.',
    whyItMatters: 'The saved file contains the encrypted result of your chosen calculation. This MCP tour has not decrypted or verified its numerical value; use the separate synthetic verifier for a correctness check.',
    observed: ['The service returned an encrypted result.', 'The encrypted result was written to the configured results folder.'],
    nextChoices: ['Explore Aura AI and its published benchmark', 'Explain how encryption keys affect who can read a result', 'Try an average using the other public samples', 'Show the verification evidence'],
    resultReading: 'In an owner-controlled deployment, an authorized recipient decrypts with their own key. This public demo uses backend-managed keys and a separate synthetic verifier.',
  }
}

export function errorHelp(code: string) {
  if (code === 'UNKNOWN_OR_EXPIRED_HANDLE') return { message: 'That encrypted reference is no longer available.', nextStep: 'Reconnect Aura to start a fresh demo. Saved result files are retained.' }
  if (code === 'INPUT_BUNDLE_REQUIRED_OR_USE_DEMO') return { message: 'The public sample tour is not enabled on this connection.', nextStep: 'Generate your app settings with --demo, update its Aura connection and reconnect. Do not paste private data into chat.' }
  if (code === 'OPERATION_UNAVAILABLE') return { message: 'The connected service does not offer that calculation right now.', nextStep: 'Check the available operations and choose one of those examples.' }
  if (code === 'BUSY' || code.includes('RATE_LIMIT')) return { message: 'Aura is busy with another request.', nextStep: 'Wait for it to finish before trying again.' }
  if (code === 'COMPUTE_ONLY_KEY_SCOPE_REQUIRED') return { message: 'The configured worker does not match this encrypted input setup.', nextStep: 'Ask your operator to check the worker and key configuration. Use a separate --demo connection for public examples.' }
  if (code === 'CANCELLED') return { message: 'The request was cancelled.', nextStep: 'No completion is claimed. Continue only when you are ready.' }
  if (code === 'DOMAIN_MISMATCH' || code === 'INVALID_OPERATION') return { message: 'Those inputs cannot be combined in that way.', nextStep: 'Use the supplied sample steps, with two integer examples for the first addition.' }
  return { message: 'Aura could not finish this step.', nextStep: 'Check the Aura connection and try again when ready. Keep connection security enabled; do not share credentials in chat.' }
}
