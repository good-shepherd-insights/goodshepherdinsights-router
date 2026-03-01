import { StrategyId } from '../../src/mastra/harness/config/harness.config.js';

export const HARNESS_TEST_CONFIG = {
    STRATEGY_IDS: {
        DEVELOPMENT: StrategyId.DEVELOPMENT,
        RESEARCH: StrategyId.RESEARCH,
        GENERAL: StrategyId.GENERAL,
    },
    PROMPTS: {
        /** Should trigger DevelopmentStrategy */
        CODE: 'Can you refactor this TypeScript function to be more efficient?',
        /** Should trigger ResearchStrategy */
        RESEARCH: 'Why did the Roman Empire collapse? Can you explain the main factors?',
        /** Should fall through to DefaultStrategy */
        GENERAL: 'Hello, what can you help me with today?',
    },
    CONTENT_MARKERS: {
        PERSONA: 'You are Eddify',
        DEV_DIRECTIVE: '[ DIRECTIVE: DEVELOPMENT ]',
        RES_DIRECTIVE: '[ DIRECTIVE: RESEARCH ]',
        GEN_DIRECTIVE: '[ DIRECTIVE: GENERAL ASSISTANT ]',
        QUERY_SEP: 'USER QUERY:',
    }
};
