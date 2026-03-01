/**
 * Concrete Strategy Implementations
 *
 * Each class encapsulates a single, specialized behavioral domain.
 * All string literals are sourced exclusively from `harness.config.ts`.
 */
import { IHarnessStrategy } from './types.js';
import {
    StrategyId,
    CLASSIFICATION_PATTERNS,
    CORE_PERSONA,
    HARNESS_DIRECTIVES,
    QUERY_SEPARATOR,
} from './config/harness.config.js';

/**
 * Shared prompt assembly function.
 * Constructs the final enriched payload from config values — no inline strings.
 */
function buildPrompt(strategyId: StrategyId, prompt: string): string {
    return [
        CORE_PERSONA,
        HARNESS_DIRECTIVES[strategyId],
        '',
        QUERY_SEPARATOR,
        prompt,
    ].join('\n');
}

/**
 * Handles software development, API design, debugging, and code generation queries.
 */
export class DevelopmentStrategy implements IHarnessStrategy {
    public readonly id = StrategyId.DEVELOPMENT;

    public canHandle(prompt: string): boolean {
        return CLASSIFICATION_PATTERNS[StrategyId.DEVELOPMENT]!.test(prompt);
    }

    public apply(prompt: string): string {
        return buildPrompt(StrategyId.DEVELOPMENT, prompt);
    }
}

/**
 * Handles analytical, research, fact-checking, and explanatory queries.
 */
export class ResearchStrategy implements IHarnessStrategy {
    public readonly id = StrategyId.RESEARCH;

    public canHandle(prompt: string): boolean {
        return CLASSIFICATION_PATTERNS[StrategyId.RESEARCH]!.test(prompt);
    }

    public apply(prompt: string): string {
        return buildPrompt(StrategyId.RESEARCH, prompt);
    }
}

/**
 * Fallback catch-all strategy for prompts not claimed by a specialized handler.
 * canHandle() always returns true — must be registered last in the Registry.
 */
export class DefaultStrategy implements IHarnessStrategy {
    public readonly id = StrategyId.GENERAL;

    // Prefixed with _ to signal the parameter is intentionally unused
    public canHandle(_prompt: string): boolean {
        return true;
    }

    public apply(prompt: string): string {
        return buildPrompt(StrategyId.GENERAL, prompt);
    }
}
