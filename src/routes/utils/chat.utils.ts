import { z } from 'zod';
import { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { Agent } from '@mastra/core/agent';

// --- 1. Boundary Validation ---

// Define strict schemas for OpenAI-compatible message content
const TextPartSchema = z.object({
    type: z.literal('text'),
    text: z.string()
});

const MessageContentSchema = z.union([
    z.string(),
    z.array(
        z.union([
            TextPartSchema,
            // Pass-through other known or unknown parts (like image_url) without validating their deep structure here
            z.object({ type: z.string() }).passthrough()
        ])
    )
]);

export function extractTextContent(rawContent: unknown): string {
    const parsed = MessageContentSchema.safeParse(rawContent);

    if (!parsed.success) {
        console.warn(`[Gateway] Invalid message content format detected. Fallback applied.`, parsed.error);
        return '';
    }

    const content = parsed.data;

    // Handle standard string content
    if (typeof content === 'string') {
        return content;
    }

    // Safely filter and extract text blocks from complex multi-modal arrays
    return content
        .filter((part): part is z.infer<typeof TextPartSchema> => part.type === 'text')
        .map(part => part.text)
        .join('\n');
}

/**
 * Safely mutates the message content to inject the enriched text without destroying 
 * other multimodal elements (e.g. image URLs) that might exist in an array.
 */
export function enrichMessageContent(content: unknown, enrichedText: string): unknown {
    if (typeof content === 'string') {
        return enrichedText;
    } else if (Array.isArray(content)) {
        const textPart = content.find((p: any) => p.type === 'text');
        if (textPart) {
            textPart.text = enrichedText; // Safely overwrite the text block
        } else {
            content.push({ type: 'text', text: enrichedText });
        }
        return content;
    }
    return enrichedText; // Fallback
}

// --- 2. Output Formatting & Transport ---

/**
 * Normalizes OpenAI o1/o3-mini specific 'developer' roles down to 'system'
 * roles, ensuring maximum compatibility with Vercel AI SDK and Mastra routers.
 */
export function normalizeRoles(messages: any[]): any[] {
    // 1. Gather all upstream context (developer/system messages)
    const contextPrompts = messages
        .filter(msg => msg.role === 'developer' || msg.role === 'system')
        .map(msg => extractTextContent(msg.content))
        .join('\n\n');

    // 2. Filter out the system/developer messages so they don't trip strict AI SDK validations
    const sanitizedMessages = messages.filter(msg => msg.role !== 'developer' && msg.role !== 'system');

    // 3. Prepend the captured system context to the very first user message to preserve the persona
    if (contextPrompts.trim().length > 0) {
        const firstUserIndex = sanitizedMessages.findIndex(msg => msg.role === 'user');
        if (firstUserIndex !== -1) {
            const originalUserText = extractTextContent(sanitizedMessages[firstUserIndex].content);
            const mergedContent = `[SYSTEM CONTEXT]\n${contextPrompts}\n\n[USER]\n${originalUserText}`;

            // Re-inject safely
            sanitizedMessages[firstUserIndex].content = enrichMessageContent(
                sanitizedMessages[firstUserIndex].content,
                mergedContent
            );
        } else {
            // Fallback: If no user message exists, create one to ensure context isn't lost
            sanitizedMessages.unshift({
                role: 'user',
                content: `[SYSTEM CONTEXT]\n${contextPrompts}`
            });
        }
    }

    // Return completely rebuilt array to sever all memory references
    return sanitizedMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
        ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
    }));
}

/**
 * Encapsulates the complexity of consuming a Mastra/Vercel AI stream and piping it 
 * out as a strictly formatted OpenAI Server-Sent Events (SSE) stream using Hono.
 * Includes error handling for disrupted inference.
 */
export async function streamOpenAIResponse(
    c: Context,
    agent: Agent,
    messages: any[],
    model: string
): Promise<Response> {
    const streamResult = await agent.stream(messages);
    const chatId = `chatcmpl-${Date.now()}`;

    return streamSSE(c, async (stream) => {
        // Initial chunk (role)
        await stream.writeSSE({
            data: JSON.stringify({
                id: chatId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model,
                choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }]
            })
        });

        // Content chunks
        for await (const chunk of streamResult.textStream) {
            await stream.writeSSE({
                data: JSON.stringify({
                    id: chatId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model,
                    choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
                })
            });
        }

        // Terminal chunk
        await stream.writeSSE({
            data: JSON.stringify({
                id: chatId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model,
                choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
            })
        });

        // End of stream
        await stream.writeSSE({ data: '[DONE]' });
    },
        // Error Handler for dropped streams
        async (err, stream) => {
            console.error('[Gateway] Stream inference failed:', err);
            await stream.writeSSE({
                data: JSON.stringify({ error: err.message || 'Stream disrupted' })
            });
        });
}
