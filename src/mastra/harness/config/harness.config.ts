/**
 * Harness Configuration Layer
 *
 * Single source of truth for all strategy identifiers, classification patterns,
 * persona strings, and directive payloads. No string literals should exist
 * in strategy or registry implementations — only references into this file.
 */

/**
 * Strategy ID declarations consumed by all concrete strategy classes.
 * String enums provide type safety and readable values in logs/metrics.
 */
export enum StrategyId {
    DEVELOPMENT = 'STRATEGY_DEVELOPMENT',
    RESEARCH = 'STRATEGY_RESEARCH',
    GENERAL = 'STRATEGY_GENERAL',
}

/**
 * Classification heuristic patterns mapped per strategy.
 * `null` denotes the fallback strategy that always accepts.
 */
export const CLASSIFICATION_PATTERNS: Record<StrategyId, RegExp | null> = {
    [StrategyId.DEVELOPMENT]: /\b(code|typescript|javascript|react|node|debug|refactor|error|api|endpoint|test|script|sql|database|git|deploy|build|compile|module|function|class|interface)\b/i,
    [StrategyId.RESEARCH]: /\b(why|explain|research|analyze|analysis|history|what is|what are|how does|how do|compare|statistics|data|truth|fact|overview|summarize|describe)\b/i,
    [StrategyId.GENERAL]: null,
};

/**
 * Base identity injected into every strategy payload.
 */
export const CORE_PERSONA = `You are Eddify, an advanced reasoning assistant powered by Good Shepherd Insights.`;

/**
 * Directive string payloads mapped by strategy.
 * Each directive is purpose-specific and mutually exclusive.
 */
export const HARNESS_DIRECTIVES: Record<StrategyId, string> = {
    [StrategyId.DEVELOPMENT]: [
        '[ DIRECTIVE: DEVELOPMENT ]',
        '- Provide production-ready, highly optimized code.',
        '- Include JSDoc comments and prioritize TypeScript type safety.',
        '- Eliminate conversational filler; respond with code and concise explanations only.',
        '- Flag any security, performance, or scalability concerns explicitly.',
    ].join('\n'),

    [StrategyId.RESEARCH]: [
        '[ DIRECTIVE: RESEARCH ]',
        '- Structure your argument with clear headers and bullet points.',
        '- If uncertain, state explicitly: "I do not have enough verified data."',
        '- Cite reasoning patterns, never fabricate citations.',
        '- Prioritize objectivity; maintain analytical neutrality throughout.',
    ].join('\n'),

    [StrategyId.GENERAL]: [
        '[ DIRECTIVE: GENERAL ASSISTANT ]',
        '- Assist the user politely, concisely, and thoroughly.',
    ].join('\n'),
};

/** Standard separator block prepended to the raw user query */
export const QUERY_SEPARATOR = '---\nUSER QUERY:';
