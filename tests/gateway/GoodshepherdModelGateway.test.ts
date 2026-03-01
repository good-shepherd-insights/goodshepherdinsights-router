import { describe, it, expect, beforeEach } from 'vitest';
import { GoodshepherdModelGateway } from '../../src/gateway/GoodshepherdModelGateway.js';
import { PROVIDER_REGISTRY } from '../../src/gateway/providers.js';
import { GATEWAY_TEST_CONFIG } from './gateway.fixtures.js';

describe('GoodshepherdModelGateway', () => {
    let gateway: GoodshepherdModelGateway;

    // Reset the gateway instance before each test to ensure test isolation
    // and prevent state leakage between assertions.
    beforeEach(() => {
        gateway = new GoodshepherdModelGateway();
    });

    /**
     * Initialization Configuration
     * 
     * Verifies that the gateway initializes with its statically configured
     * identifiers, which Mastra relies on for routing payloads.
     */
    it('should initialize with correct id and name', () => {
        expect(gateway.id).toBe(GATEWAY_TEST_CONFIG.ID);
        expect(gateway.name).toBe(GATEWAY_TEST_CONFIG.NAME);
    });

    /**
     * Provider Fetching
     * 
     * Tests the provider registry fetch logic. Ensures that the gateway correctly
     * surfaces both the custom Kilocode production provider and the local dev provider 
     * metadata required for underlying Vercel AI SDK routing.
     */
    it('should fetch providers returning kilocode and local configs', async () => {
        const providers = await gateway.fetchProviders();
        expect(providers.kilocode).toBeDefined();
        expect(providers.local).toBeDefined();

        expect(providers.kilocode.name).toBe(PROVIDER_REGISTRY.KILOCODE.name);
        expect(providers.kilocode.url).toBe(PROVIDER_REGISTRY.KILOCODE.baseURL);
        expect(providers.kilocode.gateway).toBe(GATEWAY_TEST_CONFIG.ID);
    });

    /**
     * Local Model URL Resolution
     * 
     * Confirms that models prefixed with `local:` are correctly detected
     * and routed to the default local model proxy URL format instead of the 
     * production inference endpoints.
     */
    it('should correctly determine the base URL for local models', () => {
        const url = gateway.buildUrl(GATEWAY_TEST_CONFIG.MODELS.LOCAL_DEFAULT, {});
        expect(url).toBe(PROVIDER_REGISTRY.LOCAL.baseURL);
    });

    /**
     * Production Model URL Resolution
     * 
     * Validates that standard production model identifiers (both bare aliases like
     * `giga-potato` and fully-qualified names like `kilocode:giga-potato`) are 
     * reliably resolved to the upstream Kilocode API base URL.
     */
    it('should correctly determine the base URL for kilocode models', () => {
        const url = gateway.buildUrl(GATEWAY_TEST_CONFIG.MODELS.KILOCODE_DEFAULT, {});
        expect(url).toBe(PROVIDER_REGISTRY.KILOCODE.baseURL);

        // Also test explicitly prefixed kilocode models if applicable
        const prefixedUrl = gateway.buildUrl(GATEWAY_TEST_CONFIG.MODELS.KILOCODE_PREFIXED, {});
        expect(prefixedUrl).toBe(PROVIDER_REGISTRY.KILOCODE.baseURL);
    });

    /**
     * Environment Credential Resolution
     * 
     * Simulates environment variable injection to test the gateway's credential 
     * extraction behavior. Ensures it dynamically fetches the correct environment 
     * key depending on the proxy target (Local vs Production).
     */
    it('should correctly retrieve API keys from the environment', async () => {
        process.env[PROVIDER_REGISTRY.LOCAL.envKey] = GATEWAY_TEST_CONFIG.KEYS.TEST_LOCAL;
        const localKey = await gateway.getApiKey(GATEWAY_TEST_CONFIG.MODELS.LOCAL_DEFAULT);
        expect(localKey).toBe(GATEWAY_TEST_CONFIG.KEYS.TEST_LOCAL);

        process.env[PROVIDER_REGISTRY.KILOCODE.envKey] = GATEWAY_TEST_CONFIG.KEYS.TEST_KILOCODE;
        const kiloKey = await gateway.getApiKey(GATEWAY_TEST_CONFIG.MODELS.KILOCODE_DEFAULT);
        expect(kiloKey).toBe(GATEWAY_TEST_CONFIG.KEYS.TEST_KILOCODE);
    });

    /**
     * Language Model Instantiation
     * 
     * Confirms the core logic that instantiates the Vercel AI SDK wrapper:
     * `createOpenAICompatible()`. Ensures the factory accepts raw model strings
     * and constructs the downstream language model object proxy.
     */
    it('should successfully mock resolving a language model instance', async () => {
        const model = await gateway.resolveLanguageModel({
            modelId: GATEWAY_TEST_CONFIG.MODELS.KILOCODE_DEFAULT,
            providerId: PROVIDER_REGISTRY.KILOCODE.name,
            apiKey: GATEWAY_TEST_CONFIG.KEYS.TEST_GENERIC
        });

        expect(model).toBeDefined();
        // Vercel AI SDK language models expose an id or provider property internally
        expect(typeof model).toBe('object');
    });

    /**
     * Missing Credential Handling
     * 
     * Security check: Guarantees that the gateway throws a runtime exception 
     * if an initialization attempt lacks the required credential bindings, 
     * preventing unauthorized unauthenticated pass-throughs.
     */
    it('should throw an error if API key is missing during model resolution', async () => {
        await expect(gateway.resolveLanguageModel({
            modelId: GATEWAY_TEST_CONFIG.MODELS.KILOCODE_DEFAULT,
            providerId: PROVIDER_REGISTRY.KILOCODE.name,
            apiKey: ''
        })).rejects.toThrow(GATEWAY_TEST_CONFIG.ERRORS.MISSING_API_KEY(GATEWAY_TEST_CONFIG.MODELS.KILOCODE_DEFAULT));
    });
});
