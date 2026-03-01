export const GATEWAY_TEST_CONFIG = {
    ID: 'goodshepherd',
    NAME: 'Good Shepherd Insights Router',
    MODELS: {
        KILOCODE_DEFAULT: 'giga-potato',
        KILOCODE_PREFIXED: 'kilocode:giga-potato',
        LOCAL_DEFAULT: 'local:llama3',
    },
    KEYS: {
        TEST_LOCAL: 'test-local-key',
        TEST_KILOCODE: 'test-kilo-key',
        TEST_GENERIC: 'test-api-key',
    },
    ERRORS: {
        MISSING_API_KEY: (modelId: string) => `Configuration Missing: API Key is required for model ${modelId}.`,
    }
};
