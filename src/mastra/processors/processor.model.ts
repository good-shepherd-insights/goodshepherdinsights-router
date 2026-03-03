/**
 * Processor Model Resolver
 *
 * Returns the Kilocode/minimax model instance for use by all Mastra processors.
 * Reuses the same provider and model configuration as the main eddify-alpha agent.
 * A new provider instance is created per call to ensure env vars are read at runtime.
 */
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export function getProcessorModel() {
    const provider = createOpenAICompatible({
        name: 'kilocode',
        baseURL: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway',
        apiKey: process.env.KILOCODE_API_KEY || 'MISSING_API_KEY',
    });
    return provider('minimax/minimax-m2.5:free');
}
