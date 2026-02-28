import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import { GoodshepherdModelGateway } from './gateway/GoodshepherdModelGateway.js';
import { LanguageModelV2 } from '@mastra/core/llm';

const app = express();
app.use(express.json());

const gateway = new GoodshepherdModelGateway();
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || 'your-gateway-api-key';
const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-4o';

/**
 * Authentication middleware for Bearer token validation
 */
function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        message: 'Missing or invalid authorization header',
        type: 'invalid_request_error',
        param: null,
        code: 'missing_authorization',
      },
    });
  }

  const token = authHeader.substring(7);
  if (token !== GATEWAY_API_KEY) {
    return res.status(401).json({
      error: {
        message: 'Invalid API key',
        type: 'invalid_request_error',
        param: null,
        code: 'invalid_api_key',
      },
    });
  }

  next();
}

/**
 * OpenAI-compatible /v1/chat/completions endpoint
 */
app.post('/v1/chat/completions', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      model = DEFAULT_MODEL,
      messages,
      temperature = 1,
      max_tokens,
      stream = false,
      ...rest
    } = req.body;

    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Missing or invalid messages array',
          type: 'invalid_request_error',
          param: 'messages',
          code: 'missing_messages',
        },
      });
    }

    // Get the language model from the gateway
    const languageModel = await gateway.resolveLanguageModel(model, process.env as Record<string, string>);

    if (stream) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const streamResult = await languageModel.stream({
        messages: messages as any,
        temperature,
        max_tokens,
        ...rest,
      });

      for await (const chunk of streamResult.text) {
        const delta = chunk.delta;
        if (delta) {
          res.write(`data: ${JSON.stringify({
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: Date.now(),
            model,
            choices: [{
              index: 0,
              delta: { content: delta },
              finish_reason: null,
            }],
          })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion.chunk',
        created: Date.now(),
        model,
        choices: [{
          index: 0,
          delta: {},
          finish_reason: 'stop',
        }],
      })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      // Handle non-streaming response
      const result = await languageModel.generate({
        messages: messages as any,
        temperature,
        max_tokens,
        ...rest,
      });

      const response = {
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
      };

      res.json(response);
    }
  } catch (error: any) {
    console.error('Error processing request:', error);
    
    res.status(500).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'internal_error',
        param: null,
        code: 'internal_error',
      },
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', gateway: gateway.name });
});

/**
 * Gateway info endpoint
 */
app.get('/v1/models', (req: Request, res: Response) => {
  const providers = gateway.fetchProviders();
  res.json({
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

app.listen(PORT, () => {
  console.log(`🤖 Good Shepherd Model Gateway running on http://localhost:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  http://localhost:${PORT}/health`);
  console.log(`  GET  http://localhost:${PORT}/v1/models`);
  console.log(`  POST http://localhost:${PORT}/v1/chat/completions\n`);
});
