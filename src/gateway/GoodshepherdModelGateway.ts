import { createOpenAICompatible, OpenAICompatibleProvider } from '@ai-sdk/openai-compatible';

/**
 * Provider configuration interface for the Goodshepherd Model Gateway.
 * Defines the configuration for each model provider.
 */
export interface ProviderConfig {
  /** Base URL for the OpenAI-compatible API endpoint */
  baseURL: string;
  /** API key for authentication */
  apiKey?: string;
  /** Optional provider-specific headers */
  headers?: Record<string, string>;
}

/**
 * GoodshepherdModelGateway - A model gateway that exposes
 * an OpenAI-compatible API layer for both local and hosted models.
 *
 * This gateway supports:
 * - Local models (vLLM, Ollama, TGI, custom model servers)
 * - Hosted models (OpenAI, OpenRouter, and any OpenAI-compatible provider)
 */
export class GoodshepherdModelGateway {
  /**
   * Gateway identifier
   */
  id = 'goodshepherd';

  /**
   * Gateway display name
   */
  name = 'Good Shepherd Insights Router';

  /**
   * Fetches the available provider configurations.
   * Supports both local and hosted model providers.
   * 
   * @returns Record<string, ProviderConfig> - Map of provider names to their configurations
   */
  fetchProviders(): Record<string, ProviderConfig> {
    return {
      // Local model servers
      local: {
        baseURL: process.env.MODEL_BASE_URL || 'http://localhost:8000/v1',
        apiKey: process.env.LOCAL_MODEL_API_KEY || 'local-key',
      },
      // OpenAI
      openai: {
        baseURL: 'https://api.openai.com/v1',
        apiKey: process.env.OPENAI_API_KEY,
      },
      // OpenRouter
      openrouter: {
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      },
      // Anthropic
      anthropic: {
        baseURL: 'https://api.anthropic.com/v1',
        apiKey: process.env.ANTHROPIC_API_KEY,
        headers: {
          'anthropic-version': '2023-06-01',
        },
      },
    };
  }

  /**
   * Builds the full URL for a given model ID and provider.
   * 
   * @param modelId - The model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet')
   * @param envVars - Environment variables for configuration
   * @returns string - The complete URL for the model API endpoint
   */
  buildUrl(modelId: string, envVars: Record<string, string>): string {
    const providers = this.fetchProviders();
    
    // Determine which provider to use based on model ID prefix
    let providerKey = 'local'; // Default to local
    if (modelId.startsWith('openai/') || modelId.startsWith('gpt-') || modelId.startsWith('o1-')) {
      providerKey = 'openai';
    } else if (modelId.startsWith('anthropic/') || modelId.startsWith('claude-')) {
      providerKey = 'anthropic';
    } else if (modelId.startsWith('openrouter/')) {
      providerKey = 'openrouter';
    }

    const provider = providers[providerKey];
    const baseURL = envVars.MODEL_BASE_URL || provider.baseURL;
    
    // Remove any model prefix for the actual model name
    const actualModelId = modelId.split('/').pop() || modelId;
    
    return `${baseURL}/chat/completions`;
  }

  /**
   * Resolves an OpenAICompatibleProvider for the given model ID.
   * Uses createOpenAICompatible to create an OpenAI-compatible language model provider.
   *
   * @param modelId - The model identifier
   * @param envVars - Environment variables for configuration
   * @returns OpenAICompatibleProvider - The resolved language model provider
   */
  resolveLanguageModel(
    modelId: string,
    envVars: Record<string, string>
  ): OpenAICompatibleProvider<string, string, string, string> {
    const providers = this.fetchProviders();
    
    // Determine which provider to use based on model ID prefix
    let providerKey = 'local'; // Default to local
    if (modelId.startsWith('openai/') || modelId.startsWith('gpt-') || modelId.startsWith('o1-')) {
      providerKey = 'openai';
    } else if (modelId.startsWith('anthropic/') || modelId.startsWith('claude-')) {
      providerKey = 'anthropic';
    } else if (modelId.startsWith('openrouter/')) {
      providerKey = 'openrouter';
    }

    const provider = providers[providerKey];
    const baseURL = envVars.MODEL_BASE_URL || provider.baseURL;
    const apiKey = envVars[`${providerKey.toUpperCase()}_API_KEY`] || provider.apiKey || '';
    
    // Remove any model prefix for the actual model name
    const actualModelId = modelId.split('/').pop() || modelId;

    return createOpenAICompatible({
      baseURL,
      apiKey,
      name: actualModelId,
      headers: provider.headers,
    });
  }
}
