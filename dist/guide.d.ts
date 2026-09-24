/** Public teaching text only. No encryption, decryption or user data belongs here. */
export declare const DEMO_PROMPT = "I am new to FHE. Show me the Aura demo and explain each step in simple language. Use the public sample numbers, perform the calculation, save the encrypted result, and explain what actually happened. Do not ask me to create keys or enter private data.";
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
