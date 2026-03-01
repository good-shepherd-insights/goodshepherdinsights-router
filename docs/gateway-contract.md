# Good Shepherd Model Gateway - Contract

This document describes the gateway contract and how it integrates with Mastra.

## Overview

The `GoodshepherdModelGateway` is a Mastra-based model gateway that exposes an OpenAI-compatible API layer for both local and hosted models. It extends the `MastraModelGateway` class from `@mastra/core/llm`.

## Gateway Class

### GoodshepherdModelGateway

```typescript
import { GoodshepherdModelGateway } from './gateway/GoodshepherdModelGateway';

const gateway = new GoodshepherdModelGateway();
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Gateway identifier: `"goodshepherd"` |
| `name` | `string` | Gateway display name: `"Good Shepherd Insights Router"` |

### Methods

#### fetchProviders()

Returns a record of available provider configurations.

```typescript
fetchProviders(): Record<string, ProviderConfig>
```

**Returns:**
- `Record<string, ProviderConfig>` - Map of provider names to their configurations

**Example:**
```typescript
const providers = gateway.fetchProviders();
// {
//   local: { baseURL: 'http://localhost:8000/v1', apiKey: 'local-key' },
//   openai: { baseURL: 'https://api.openai.com/v1', apiKey: 'sk-...' },
//   openrouter: { baseURL: 'https://openrouter.ai/api/v1', apiKey: 'sk-or-...' },
//   anthropic: { baseURL: 'https://api.anthropic.com/v1', apiKey: 'sk-ant-...' }
// }
```

#### buildUrl()

Builds the full URL for a given model ID and environment variables.

```typescript
buildUrl(modelId: string, envVars: Record<string, string>): string
```

**Parameters:**
- `modelId` - The model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet')
- `envVars` - Environment variables for configuration

**Returns:**
- `string` - The complete URL for the model API endpoint

#### resolveLanguageModel()

Resolves a LanguageModelV2 instance for the given model ID.

```typescript
async resolveLanguageModel(
  modelId: string,
  envVars: Record<string, string>
): Promise<LanguageModelV2>
```

**Parameters:**
- `modelId` - The model identifier
- `envVars` - Environment variables for configuration

**Returns:**
- `Promise<LanguageModelV2>` - The resolved language model instance

## Provider Configuration

### ProviderConfig Interface

```typescript
interface ProviderConfig {
  /** Base URL for the OpenAI-compatible API endpoint */
  baseURL: string;
  /** API key for authentication */
  apiKey?: string;
  /** Optional provider-specific headers */
  headers?: Record<string, string>;
}
```

### Supported Providers

| Provider | Base URL | Environment Variable |
|----------|----------|---------------------|
| Local | `http://localhost:8000/v1` | `MODEL_BASE_URL`, `LOCAL_MODEL_API_KEY` |
| OpenAI | `https://api.openai.com/v1` | `OPENAI_API_KEY` |
