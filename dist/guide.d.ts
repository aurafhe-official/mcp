/** Public teaching text only. No encryption, decryption or user data belongs here. */
export declare const DEMO_PROMPT = "I am new to FHE and Aura. Show me what I can do with Aura, starting with its AI application and the benchmark published on its website. Distinguish the separate AI application from tools available through this MCP. Then offer the optional public-sample lesson. Do not request private data or run a calculation until I choose it.";
export declare const LEARN_PROMPT = "I am new to FHE. Run the optional Aura public-sample lesson and explain each step in simple language. Call aura_start with experience learn, prepare the fixed samples, calculate and save the encrypted result. Do not ask me to create keys or enter private data.";
/** Public website claims, explicitly separate from this session's observations. */
export declare function applicationStory(): {
    purpose: string;
    flagship: {
        name: string;
        model: string;
        parameters: string;
        benchmark: {
            generationTokensPerSecond: string;
            hardware: string;
            promptReadIn: string;
            classification: string;
            source: string;
            sourceCheckedOn: string;
            liveMeasurement: boolean;
            independentlyVerifiedHere: boolean;
        };
        availableThroughThisMcp: boolean;
        access: {
            walkthrough: string;
            browserApplication: string;
            availability: string;
            fallback: string;
            connectionAdvice: string;
        };
    };
    availableHere: string[];
    privacy: string;
};
export declare function overviewGuide(): {
    title: string;
    message: string;
    whyItMatters: string;
    choices: ({
        label: string;
        url: string;
        description: string;
        action?: undefined;
    } | {
        label: string;
        action: {
            tool: string;
            arguments: {
                experience: string;
            };
        };
        description: string;
        url?: undefined;
    })[];
    nextStep: string;
    needsPrivateData: boolean;
};
export declare const HOST_GUIDANCE: string;
export declare function welcomeGuide(demo: boolean, configured: boolean, additionAvailable: boolean): {
    title: string;
    message: string;
    nextStep: string;
    needsPrivateData: boolean;
} | {
    nextAction: {
        tool: string;
        arguments: {};
    };
    step: number;
    totalSteps: number;
    title: string;
    message: string;
    whyItMatters: string;
    sample: {
        story: string;
        values: number[];
        expectedSum: number;
        expectedSumIsNotAnObservedResult: boolean;
    };
    modeNote: string;
    steps: string[];
    nextStep?: undefined;
    needsPrivateData?: undefined;
} | {
    nextStep: string;
    step: number;
    totalSteps: number;
    title: string;
    message: string;
    whyItMatters: string;
    sample: {
        story: string;
        values: number[];
        expectedSum: number;
        expectedSumIsNotAnObservedResult: boolean;
    };
    modeNote: string;
    steps: string[];
    needsPrivateData?: undefined;
};
export declare function preparedGuide(inputs: {
    handle: string;
    index: number;
}[]): {
    title: string;
    message: string;
    step?: undefined;
    totalSteps?: undefined;
    whyItMatters?: undefined;
    nextAction?: undefined;
} | {
    step: number;
    totalSteps: number;
    title: string;
    message: string;
    whyItMatters: string;
    nextAction: {
        tool: string;
        arguments: {
            op: string;
            handles: string[];
        };
    };
};
export declare function computedGuide(handle: string): {
    step: number;
    totalSteps: number;
    title: string;
    message: string;
    whyItMatters: string;
    nextAction: {
        tool: string;
        arguments: {
            handle: string;
        };
    };
};
export declare function savedGuide(): {
    step: number;
    totalSteps: number;
    title: string;
    message: string;
    whyItMatters: string;
    observed: string[];
    nextChoices: string[];
    resultReading: string;
};
export declare function errorHelp(code: string): {
    message: string;
    nextStep: string;
};
