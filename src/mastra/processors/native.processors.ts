/**
 * Native Mastra Processor Instances
 *
 * Instantiates @mastra/core built-in processor classes using the project's
 * existing Kilocode/minimax model. These run AFTER IntegrityProcessor.
 *
 * - PIIDetector: redacts PII from the post-integrity output using placeholder strategy
 * - ModerationProcessor: blocks standard harm categories (no custom off-topic)
 *
 * jsonPromptInjection: true — instructs Mastra to inject JSON structure via system prompt
 * rather than using native response_format, as minimax-m2.5 may not support it natively.
 */
import { ModerationProcessor, PIIDetector } from '@mastra/core/processors';
import { getProcessorModel } from './processor.model.js';

const model = getProcessorModel();

/**
 * PII redaction — detects and replaces sensitive data with typed placeholders.
 * Runs before moderation to ensure clean content enters the safety check.
 */
export const piiDetector = new PIIDetector({
    model,
    strategy: 'redact',
    redactionMethod: 'placeholder',
    detectionTypes: ['email', 'phone', 'api-key', 'ssn', 'credit-card'],
    structuredOutputOptions: { jsonPromptInjection: true },
});

/**
 * Content moderation — blocks harmful output using standard harm taxonomy.
 * Runs last so it evaluates the fully-cleaned, PII-scrubbed response.
 */
export const moderationProcessor = new ModerationProcessor({
    model,
    threshold: 0.7,
    strategy: 'block',
    categories: ['hate', 'harassment', 'violence', 'self-harm', 'sexual'],
    structuredOutputOptions: { jsonPromptInjection: true },
});
