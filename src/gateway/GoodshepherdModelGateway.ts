import { MastraModelGateway, ProviderConfig, GatewayLanguageModel } from '@mastra/core/llm';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { PROVIDER_REGISTRY } from './providers';

export class GoodshepherdModelGateway extends MastraModelGateway {
  readonly id = 'goodshepherd';
  readonly name = 'Good Shepherd Insights Router';

  async fetchProviders(): Promise<Record<string, ProviderConfig>> {
    return {
      kilocode: {
        name: PROVIDER_REGISTRY.KILOCODE.name,
        url: PROVIDER_REGISTRY.KILOCODE.baseURL,
        apiKeyEnvVar: PROVIDER_REGISTRY.KILOCODE.envKey,
        models: ['*'],
        gateway: this.id,
      },
      local: {
        name: PROVIDER_REGISTRY.LOCAL.name,
        url: PROVIDER_REGISTRY.LOCAL.baseURL,
        apiKeyEnvVar: PROVIDER_REGISTRY.LOCAL.envKey,
        models: ['*'],
        gateway: this.id,
      }
    };
  }

  buildUrl(modelId: string, envVars: Record<string, string>): string | undefined {
    const isLocal = modelId.startsWith('local:');
    const provider = isLocal ? PROVIDER_REGISTRY.LOCAL : PROVIDER_REGISTRY.KILOCODE;
    return envVars[provider.baseURL] || provider.baseURL; // Simplified for this example
  }

  async getApiKey(modelId: string): Promise<string> {
    const isLocal = modelId.startsWith('local:');
    const provider = isLocal ? PROVIDER_REGISTRY.LOCAL : PROVIDER_REGISTRY.KILOCODE;
    return process.env[provider.envKey] || '';
  }

  async resolveLanguageModel(args: {
    modelId: string;
    providerId: string;
    apiKey: string;
    headers?: Record<string, string>;
  }): Promise<GatewayLanguageModel> {
    const { modelId, apiKey } = args;
    const isLocal = modelId.startsWith('local:');
    const provider = isLocal ? PROVIDER_REGISTRY.LOCAL : PROVIDER_REGISTRY.KILOCODE;
    const actualModelName = modelId.includes(':') && !isLocal ? modelId.split(':')[1] : modelId;

    if (!apiKey) {
      throw new Error(`Configuration Missing: API Key is required for model ${modelId}.`);
    }

    const providerInstance = createOpenAICompatible({
      name: provider.name,
      baseURL: provider.baseURL,
      apiKey,
      headers: args.headers,
    });

    return providerInstance(actualModelName) as any as GatewayLanguageModel;
  }
}
