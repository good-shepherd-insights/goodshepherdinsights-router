import { Hono } from 'hono';
import { authenticate } from '../middleware/index.js';
import { getEddifyAgent } from '../mastra/index.js';
import { harnessRouter } from '../mastra/harness/index.js';

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

        // Extract raw user query from the final message in the conversation
        const rawPrompt = messages[messages.length - 1]?.content || '';

        // Classify intent and delegate to the appropriate strategy harness
        const enrichedPrompt = harnessRouter.routePayload(rawPrompt);

        if (stream) {
            const streamResult = await getEddifyAgent().stream(enrichedPrompt);
            return new Response(streamResult.textStream as any, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        } else {
            const result = await getEddifyAgent().generate(enrichedPrompt);
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
