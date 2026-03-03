import { Hono } from 'hono';
import { authenticate } from '../middleware/index.js';
import { getEddifyAgent } from '../mastra/index.js';
import { harnessRouter } from '../mastra/harness/index.js';
import { monitor } from '../monitor/monitor.js';
import { extractTextContent, enrichMessageContent, streamOpenAIResponse, normalizeRoles } from './utils/chat.utils.js';

const chatRoutes = new Hono();
const DEFAULT_MODEL = 'eddify-alpha';

chatRoutes.post('/v1/chat/completions', authenticate, async (c) => {
    try {
        const body = await c.req.json();
        const { model = DEFAULT_MODEL, messages: rawMessages, stream = false } = body;

        // Validate required fields
        if (!rawMessages || !Array.isArray(rawMessages) || rawMessages.length === 0) {
            return c.json({
                error: {
                    message: 'Missing or invalid messages array',
                    type: 'invalid_request_error',
                    param: 'messages',
                    code: 'missing_messages',
                },
            }, 400);
        }

        // Ensure OpenAI/OpenClaw 'developer' roles are coerced to system for AI SDK
        const messages = normalizeRoles(rawMessages);

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

        // Locate the final user query to apply our internal harness strategy
        // We DO NOT filter out system/developer messages; OpenClaw's persona is retained.
        let lastUserMsgIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserMsgIndex = i;
                break;
            }
        }
        if (lastUserMsgIndex !== -1) {
            const msg = messages[lastUserMsgIndex];
            const rawPrompt = extractTextContent(msg.content);
            const enrichedText = harnessRouter.routePayload(rawPrompt);

            // Provide the strategy harness directives as supplemental context to the user message
            // PREVENT MULTIMODAL DATA LOSS: Safely inject enriched text without destroying arrays
            msg.content = enrichMessageContent(msg.content, enrichedText);
        }

        if (stream) {
            return await streamOpenAIResponse(c, getEddifyAgent(), messages, model);
        } else {
            const result = await getEddifyAgent().generate(messages);
            const usage: any = result.usage;

            monitor.agentOutput(result.text || '', usage);

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
        console.error('[Gateway] Inference Error:', error);
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
