import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { mastra } from './mastra/index.js';
import { GoodshepherdModelGateway } from './gateway/GoodshepherdModelGateway.js';

const app = new Hono();
const gateway = new GoodshepherdModelGateway();
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || 'your-gateway-api-key';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-4o';

/**
 * Authentication middleware for Bearer token validation
 */
function authenticate(c: any, next: () => Promise<void>) {
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

/**
 * OpenAI-compatible /v1/chat/completions endpoint
 */
app.post('/v1/chat/completions', authenticate, async (c) => {
  try {
    const body = await c.req.json();
    const {
      model = DEFAULT_MODEL,
      messages,
      temperature = 1,
      max_tokens,
      stream = false,
      ...rest
    } = body;

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

    // Get the language model from the gateway
    const languageModel = await gateway.resolveLanguageModel(model, process.env as Record<string, string>);

    if (stream) {
      // Handle streaming response
      const streamResult = await languageModel.stream({
        messages: messages as any,
        temperature,
        max_tokens,
        ...rest,
      });

      return c.text('', 200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
    } else {
      // Handle non-streaming response
      const result = await languageModel.generate({
        messages: messages as any,
        temperature,
        max_tokens,
        ...rest,
      });

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
          prompt_tokens: result.usage?.promptTokens || 0,
          completion_tokens: result.usage?.completionTokens || 0,
          total_tokens: (result.usage?.promptTokens || 0) + (result.usage?.completionTokens || 0),
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

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', gateway: gateway.name });
});

/**
 * Gateway info endpoint
 */
app.get('/v1/models', (c) => {
  const providers = gateway.fetchProviders();
  return c.json({
    object: 'list',
    data: Object.entries(providers).map(([id, config]) => ({
      id,
      object: 'model',
      created: Date.now(),
      owned_by: 'goodshepherd',
    })),
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
