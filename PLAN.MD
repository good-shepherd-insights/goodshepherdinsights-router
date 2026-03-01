# Enterprise Upgrade Plan: Good Shepherd Model Gateway (Mastra v1.5.0)

This architectural blueprint defines the technical roadmap for upgrading the gateway from Mastra v0.7.0 to v1.5.0, standardized on the **Kilocode AI Gateway**.

## 1. Architectural Reasoning & Justification

### A. Mastra v1.5.0 Framework Alignment
**Justification**: Mastra v1.x introduces a stable core API, superior TypeScript types, and deep integration with the Vercel AI SDK. 
- **Reasoning**: v0.7.0 uses experimental structures. Upgrading to v1.5.0 ensures we are on the stable long-term support line, reducing future refactoring costs.

### B. Kilocode-First Provider Registry (`src/gateway/providers.ts`)
**Justification**: Decouple endpoint configuration from execution logic, prioritizing the Kilocode AI Gateway.
- **Reasoning**: In production, model endpoints change independently of code. This registry allows switching providers via environment variables without modifying core logic.

```typescript
// Proposed: src/gateway/providers.ts
export const PROVIDER_REGISTRY = {
  KILOCODE: {
    name: 'kilocode',
    baseURL: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway',
    envKey: 'KILOCODE_API_KEY',
  },
  LOCAL: {
    name: 'local',
    baseURL: process.env.MODEL_BASE_URL || 'http://localhost:8000/v1',
    envKey: 'LOCAL_MODEL_API_KEY',
  }
};
```

### C. Refactored Gateway Resolve Logic (`GoodshepherdModelGateway.ts`)
**Justification**: Implement deterministic, prefix-aware model routing for Kilocode.
- **Reasoning**: The new logic defaults all requests to the Kilocode Gateway while allowing explicit local failovers via the `local:` prefix. This removes the ambiguity present in the v0.7.0 implementation.

```typescript
// Proposed: src/gateway/GoodshepherdModelGateway.ts
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { PROVIDER_REGISTRY } from './providers';

export class GoodshepherdModelGateway {
  public name = 'Good Shepherd Insights Router';

  async resolveLanguageModel(modelId: string) {
    const isLocal = modelId.startsWith('local:');
    const provider = isLocal ? PROVIDER_REGISTRY.LOCAL : PROVIDER_REGISTRY.KILOCODE;
    const actualModelName = isLocal ? modelId.split(':')[1] : modelId;
    const apiKey = process.env[provider.envKey];

    if (!apiKey) {
      throw new Error(`Configuration Missing: ${provider.envKey} is not defined.`);
    }

    const providerInstance = createOpenAICompatible({
      name: provider.name,
      baseURL: provider.baseURL,
      apiKey,
    });

    return providerInstance(actualModelName);
  }
}
```

## 2. Technical Blueprint (Build-Ready)

### Dependency Manifest
```json
{
  "dependencies": {
    "@mastra/core": "^1.5.0",
    "@ai-sdk/openai-compatible": "^2.0.31",
    "@hono/node-server": "^1.13.7",
    "hono": "^4.7.4",
    "tsx": "^4.19.3"
  }
}
```

## 3. Implementation Workflow

1.  **Dependency Alignment**: Update `package.json` to the build-ready manifest.
2.  **Infrastructure Initialization**: 
    - Create `src/gateway/providers.ts` with Kilocode config.
    - Update `src/mastra/index.ts` for v1.5 configuration.
3.  **Gateway Migration**: Rewrite `GoodshepherdModelGateway.ts` using the new provider patterns.
4.  **Build & Validation**: Execute `npm run build` and verify streaming against the Kilocode gateway.
