import { describe, it, expect } from 'vitest';
import { DevelopmentStrategy, ResearchStrategy, DefaultStrategy } from '../../src/mastra/harness/strategies.js';
import { HarnessRegistry } from '../../src/mastra/harness/Registry.js';
import { HARNESS_TEST_CONFIG } from './harness.fixtures.js';

const { PROMPTS, CONTENT_MARKERS } = HARNESS_TEST_CONFIG;

describe('DevelopmentStrategy', () => {

    /**
     * Classification Acceptance
     *
     * Verifies the strategy correctly claims ownership of software
     * engineering prompts containing known development keywords.
     */
    it('should claim code-related prompts', () => {
        const strategy = new DevelopmentStrategy();
        expect(strategy.canHandle(PROMPTS.CODE)).toBe(true);
    });

    /**
     * Classification Rejection
     *
     * Verifies the strategy does NOT claim prompts unrelated to development,
     * preventing directive pollution across domains.
     */
    it('should not claim research or general prompts', () => {
        const strategy = new DevelopmentStrategy();
        expect(strategy.canHandle(PROMPTS.RESEARCH)).toBe(false);
        expect(strategy.canHandle(PROMPTS.GENERAL)).toBe(false);
    });

    /**
     * Payload Construction
     *
     * Confirms the enriched prompt contains the core persona,
     * the development-specific directive, and the original user query.
     */
    it('should apply the development directive to the payload', () => {
        const strategy = new DevelopmentStrategy();
        const result = strategy.apply(PROMPTS.CODE);
        expect(result).toContain(CONTENT_MARKERS.PERSONA);
        expect(result).toContain(CONTENT_MARKERS.DEV_DIRECTIVE);
        expect(result).toContain(PROMPTS.CODE);
    });
});

describe('ResearchStrategy', () => {

    /**
     * Classification Acceptance
     *
     * Verifies the strategy correctly claims analytical, explanatory,
     * and fact-checking prompts.
     */
    it('should claim research-related prompts', () => {
        const strategy = new ResearchStrategy();
        expect(strategy.canHandle(PROMPTS.RESEARCH)).toBe(true);
    });

    /**
     * Classification Rejection
     *
     * Guarantees the research strategy does not falsely intercept
     * code-specific or general prompts.
     */
    it('should not claim code or general prompts', () => {
        const strategy = new ResearchStrategy();
        expect(strategy.canHandle(PROMPTS.CODE)).toBe(false);
        expect(strategy.canHandle(PROMPTS.GENERAL)).toBe(false);
    });

    /**
     * Payload Construction
     *
     * Confirms the enriched prompt embeds the research directive
     * block and retains the original query intact.
     */
    it('should apply the research directive to the payload', () => {
        const strategy = new ResearchStrategy();
        const result = strategy.apply(PROMPTS.RESEARCH);
        expect(result).toContain(CONTENT_MARKERS.PERSONA);
        expect(result).toContain(CONTENT_MARKERS.RES_DIRECTIVE);
        expect(result).toContain(PROMPTS.RESEARCH);
    });
});

describe('DefaultStrategy', () => {

    /**
     * Unconditional Fallback Acceptance
     *
     * The fallback strategy must always claim responsibility for any
     * incoming prompt to guarantee no request is left unhandled.
     */
    it('should always claim any prompt as a fallback', () => {
        const strategy = new DefaultStrategy();
        expect(strategy.canHandle(PROMPTS.CODE)).toBe(true);
        expect(strategy.canHandle(PROMPTS.RESEARCH)).toBe(true);
        expect(strategy.canHandle(PROMPTS.GENERAL)).toBe(true);
    });

    /**
     * Payload Construction
     *
     * Validates the general directive block is applied and the user query preserved.
     */
    it('should apply the general directive to the payload', () => {
        const strategy = new DefaultStrategy();
        const result = strategy.apply(PROMPTS.GENERAL);
        expect(result).toContain(CONTENT_MARKERS.PERSONA);
        expect(result).toContain(CONTENT_MARKERS.GEN_DIRECTIVE);
        expect(result).toContain(PROMPTS.GENERAL);
    });
});

describe('HarnessRegistry', () => {

    /**
     * Strategy Priority — Development Route
     *
     * Confirms the registry routes a code prompt to the DevelopmentStrategy
     * and not to the fallback, validating correct evaluation precedence.
     */
    it('should route code prompts to the development harness', () => {
        const registry = new HarnessRegistry();
        const result = registry.routePayload(PROMPTS.CODE);
        expect(result).toContain(CONTENT_MARKERS.DEV_DIRECTIVE);
        expect(result).not.toContain(CONTENT_MARKERS.GEN_DIRECTIVE);
    });

    /**
     * Strategy Priority — Research Route
     *
     * Confirms the registry routes an analytical prompt to the ResearchStrategy.
     */
    it('should route research prompts to the research harness', () => {
        const registry = new HarnessRegistry();
        const result = registry.routePayload(PROMPTS.RESEARCH);
        expect(result).toContain(CONTENT_MARKERS.RES_DIRECTIVE);
        expect(result).not.toContain(CONTENT_MARKERS.DEV_DIRECTIVE);
    });

    /**
     * Strategy Priority — General Fallback Route
     *
     * Confirms that prompts not matched by specialized strategies
     * are safely routed to the DefaultStrategy.
     */
    it('should fall back to the general harness for unclassified prompts', () => {
        const registry = new HarnessRegistry();
        const result = registry.routePayload(PROMPTS.GENERAL);
        expect(result).toContain(CONTENT_MARKERS.GEN_DIRECTIVE);
        expect(result).not.toContain(CONTENT_MARKERS.DEV_DIRECTIVE);
        expect(result).not.toContain(CONTENT_MARKERS.RES_DIRECTIVE);
    });

    /**
     * Payload Integrity
     *
     * Confirms that regardless of the classified strategy, the
     * raw user query is always preserved and appended to the output.
     */
    it('should preserve the original user query in all routed payloads', () => {
        const registry = new HarnessRegistry();
        expect(registry.routePayload(PROMPTS.CODE)).toContain(PROMPTS.CODE);
        expect(registry.routePayload(PROMPTS.RESEARCH)).toContain(PROMPTS.RESEARCH);
        expect(registry.routePayload(PROMPTS.GENERAL)).toContain(PROMPTS.GENERAL);
    });

    /**
     * Separator Injection
     *
     * Confirms the USER QUERY separator block is injected into
     * every routed payload regardless of strategy.
     */
    it('should inject the USER QUERY separator into all payloads', () => {
        const registry = new HarnessRegistry();
        expect(registry.routePayload(PROMPTS.CODE)).toContain(CONTENT_MARKERS.QUERY_SEP);
        expect(registry.routePayload(PROMPTS.RESEARCH)).toContain(CONTENT_MARKERS.QUERY_SEP);
        expect(registry.routePayload(PROMPTS.GENERAL)).toContain(CONTENT_MARKERS.QUERY_SEP);
    });
});
