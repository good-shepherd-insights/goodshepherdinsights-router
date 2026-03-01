# Refactoring Plan for `src/index.ts`

## 1. Context and Reasoning
Currently, `src/index.ts` acts as a monolithic file. It handles environment configuration, server initialization, authentication middleware, route definitions, and complex business logic for handling streaming and non-streaming completions. 

Extracting these responsibilities into distinct modules (following the Single Responsibility Principle) will improve code readability, testability, and scalability. It will also reduce the size of the main entry point file. Using a barrel file export pattern simplifies imports across the application.

## 2. Proposed Architecture / File Structure
```
src/
├── index.ts               # Entry point: App instantiation and route mounting
├── middleware/
│   ├── index.ts           # Barrel file for middleware exports
│   └── auth.ts            # Bearer token validation logic
└── routes/
    ├── index.ts           # Barrel file for route exports
    ├── chat.ts            # Chat completions endpoint (/v1/chat/completions)
    └── core.ts            # Health and models endpoints (/health, /v1/models)
```

## 3. Proposed Code Changes

### [NEW] `src/middleware/auth.ts`
Extracts the authentication validation.
```typescript
import { Context, Next } from 'hono';

const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || 'your-gateway-api-key';

export async function authenticate(c: Context, next: Next) {
  const authHeader = c.req.header('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      error: {
        message: 'Missing or invalid authorization header',
        type: 'invalid_request_error',
        param: null,
        code: 'missing_authorization',
      },
    }, 401);
  }

  const token = authHeader.substring(7);
  if (token !== GATEWAY_API_KEY) {
    return c.json({
      error: {
        message: 'Invalid API key',
        type: 'invalid_request_error',
        param: null,
        code: 'invalid_api_key',
      },
    }, 401);
  }

  return next();
}
```

### [NEW] `src/middleware/index.ts`
Barrel file for middleware exports.
```typescript
export * from './auth.js';
```

### [NEW] `src/routes/core.ts`
Registers the simple informational routes.
```typescript
import { Hono } from 'hono';
import { gateway } from '../mastra/index.js';

const coreRoutes = new Hono();

coreRoutes.get('/health', (c) => {
  return c.json({ status: 'ok', gateway: gateway.name });
});

coreRoutes.get('/v1/models', (c) => {
  return c.json({
    object: 'list',
    data: [{
      id: 'eddify-alpha',
      object: 'model',
      created: Date.now(),
      owned_by: 'goodshepherd',
    }]
  });
});

export default coreRoutes;
```

### [NEW] `src/routes/chat.ts`
Isolates the complex prompt handling, model checks, and streaming/non-streaming Mastra agent processing.
```typescript
import { Hono } from 'hono';
import { authenticate } from '../middleware/index.js';
import { getEddifyAgent } from '../mastra/index.js';

const chatRoutes = new Hono();
const DEFAULT_MODEL = 'eddify-alpha';

chatRoutes.post('/v1/chat/completions', authenticate, async (c) => {
  try {
    const body = await c.req.json();
    const { model = DEFAULT_MODEL, messages, stream = false } = body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({
        error: {
          message: 'Missing or invalid messages array',
          type: 'invalid_request_error',
          param: 'messages',
          code: 'missing_messages',
        },
      }, 400);
    }

    // Force exclusivity to eddify-alpha
    if (model !== 'eddify-alpha') {
      return c.json({
        error: {
          message: `Model '${model}' does not exist or you do not have access to it. This gateway exclusively serves 'eddify-alpha'.`,
          type: 'invalid_request_error',
          param: 'model',
          code: 'model_not_found',
        },
      }, 404);
    }

    const prompt = messages[messages.length - 1]?.content || '';

    if (stream) {
      const streamResult = await getEddifyAgent().stream(prompt);
      return new Response(streamResult.textStream as any, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      const result = await getEddifyAgent().generate(prompt);
      const usage: any = result.usage;

      return c.json({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content: result.text || '',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: usage?.inputTokens || 0,
          completion_tokens: usage?.outputTokens || 0,
          total_tokens: usage?.totalTokens || ((usage?.inputTokens || 0) + (usage?.outputTokens || 0)),
        },
      });
    }
  } catch (error: any) {
    console.error('Error processing request:', error);
    return c.json({
      error: {
        message: error.message || 'Internal server error',
        type: 'internal_error',
        param: null,
        code: 'internal_error',
      },
    }, 500);
  }
});

export default chatRoutes;
```

### [NEW] `src/routes/index.ts`
Barrel file for route exports.
```typescript
export { default as chatRoutes } from './chat.js';
export { default as coreRoutes } from './core.js';
```

### [MODIFY] `src/index.ts`
Simplifies the main server file to only import and mount the routes from the barrel file.
```typescript
import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { initMastra } from './mastra/index.js';
import { coreRoutes, chatRoutes } from './routes/index.js';

const app = new Hono();

// Mount externalized routes
app.route('/', coreRoutes);
app.route('/', chatRoutes);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Mastra backend before starting the server process
initMastra().then(() => {
  console.log('✅ Mastra and EddifyAgent successfully initialized.');
  serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      console.log(`🤖 Good Shepherd Model Gateway running on http://localhost:${info.port}`);
      console.log(`\nAvailable endpoints:`);
      console.log(`  GET  http://localhost:${info.port}/health`);
      console.log(`  GET  http://localhost:${info.port}/v1/models`);
      console.log(`  POST http://localhost:${info.port}/v1/chat/completions\n`);
    },
  );
}).catch((err) => {
  console.error("❌ Failed to initialize Mastra or start server: ", err);
  process.exit(1);
});
```
