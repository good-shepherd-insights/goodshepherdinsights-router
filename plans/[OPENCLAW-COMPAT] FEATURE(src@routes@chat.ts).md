# Fix: OpenClaw Compatibility for Good Shepherd Gateway

OpenClaw sends requests differently than raw curl. Our initial plan contained a flawed architectural approach that reduced all requests to single-turn interactions. This revised plan fixes four compatibility gaps using Mastra-compliant patterns and production-ready code separation.

---

## Gap Analysis & Architectural Fixes

### 1. Content Format & Extensibility — `string` vs `object[]`

**OpenClaw sends:** `"content": [{ "type": "text", "text": "Hello" }]`
**Current Code receives:** `[object Object]` because it expects a plain string.

**The Fix:** We will implement a robust `extractTextContent` normalizer. However, unlike the previous plan, we will ensure that only the string representation is passed to `harnessRouter.routePayload`, while preserving original message objects (including potential future image/attachment types) for the rest of the array.

---

### 2. Conversation Context Destruction (Multi-Turn)

**The Flaw (Badly Designed System):** The original code arbitrarily extracted ONLY the last message's content and discarded the rest of the dialogue history, breaking OpenClaw's ability to maintain a conversation. 
**The Fix:** Mastra's `Agent.stream` and `Agent.generate` natively accept an array of CoreMessages. We will pass the **entire sanitized conversation array** to Mastra, ensuring Eddify remains multi-turn capable. 

### 3. Persona Conflict (`developer` / `system` Role)

OpenClaw sends its system prompt (AGENTS.md, SOUL.md, TOOLS.md) using the `developer` role. 
**The Flaw:** The previous plan incorrectly assumed the gateway should aggressively overwrite upstream personas and discard `developer`/`system` roles. This is an anti-pattern; gateways should be additive or supplemental, not destructive to the client's context.
**The Fix:** We will retain **all** messages sent by OpenClaw. The Harness strategy (`harnessRouter`) will act as a supplemental routing layer. Rather than replacing the persona, it will analyze the final user message and append contextual directives to it, ensuring Eddify benefits from both OpenClaw's core identity and the gateway's routing strategies.

---

### 4. Streaming Response Format — Bloated Route Controller

**The Flaw:** SSE stream generation is currently hardcoded and tightly coupled directly inside the Hono route handler, bloating the controller.
**The Fix:** OpenClaw expects standard OpenAI SSE (`chat.completion.chunk`). We will use Hono's native `streamSSE` utility to cleanly format and pipe the stream.

---

## Proposed Changes

### 1. Utilities: Content Normalization and Stream Transport

#### [NEW] [src/routes/utils/chat.utils.ts](file:///Users/dev/Projects/goodshepherdinsights-router/src/routes/utils/chat.utils.ts)

Create a dedicated utility file to strictly validate and normalize incoming payloads using Zod, and encapsulate Server-Sent Events (SSE) stream formatting. This keeps the Hono controller extremely lightweight and focused strictly on HTTP lifecycle routing, adhering to enterprise separation-of-concerns.

```typescript
import { z } from 'zod';
import { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import { Agent } from '@mastra/core/agent';
import { CoreMessage, CoreUserMessage } from 'ai';

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
 * Encapsulates the complexity of consuming a Mastra/Vercel AI stream and piping it 
 * out as a strictly formatted OpenAI Server-Sent Events (SSE) stream using Hono.
 * Includes error handling for disrupted inference.
 */
export async function streamOpenAIResponse(
    c: Context, 
    agent: Agent, 
    messages: CoreMessage[], 
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
```

### 2. Chat Route Handler

#### [MODIFY] [src/routes/chat.ts](file:///Users/dev/Projects/goodshepherdinsights-router/src/routes/chat.ts)

Refactor to process multi-turn message arrays natively, retain all upstream context, and use **Hono's first-party `streamSSE`**.

```diff
-import { Hono } from 'hono';
-import { authenticate } from '../middleware/index.js';
-import { getEddifyAgent } from '../mastra/index.js';
-import { harnessRouter } from '../mastra/harness/index.js';
-import { monitor } from '../monitor/monitor.js';
+import { Hono } from 'hono';
+import { authenticate } from '../middleware/index.js';
+import { getEddifyAgent } from '../mastra/index.js';
+import { harnessRouter } from '../mastra/harness/index.js';
+import { monitor } from '../monitor/monitor.js';
+import { extractTextContent, enrichMessageContent, streamOpenAIResponse } from './utils/chat.utils.js';
 
 const chatRoutes = new Hono();
 const DEFAULT_MODEL = 'eddify-alpha';

@@ -39,15 +40,30 @@
 
-        // Extract raw user query from the final message in the conversation
-        const rawPrompt = messages[messages.length - 1]?.content || '';
-
-        // Classify intent and delegate to the appropriate strategy harness
-        const enrichedPrompt = harnessRouter.routePayload(rawPrompt);
+        // Locate the final user query to apply our internal harness strategy
+        // We DO NOT filter out system/developer messages; OpenClaw's persona is retained.
+        const lastUserMsgIndex = messages.findLastIndex((m: any) => m.role === 'user');
+        if (lastUserMsgIndex !== -1) {
+            const msg = messages[lastUserMsgIndex];
+            const rawPrompt = extractTextContent(msg.content);
+            const enrichedText = harnessRouter.routePayload(rawPrompt);
+            
+            // Provide the strategy harness directives as supplemental context to the user message
+            // PREVENT MULTIMODAL DATA LOSS: Safely inject enriched text without destroying arrays
+            msg.content = enrichMessageContent(msg.content, enrichedText);
+        }
 
-        if (stream) {
-            const streamResult = await getEddifyAgent().stream(enrichedPrompt);
-            return new Response(streamResult.textStream as any, {
-                headers: {
-                    'Content-Type': 'text/event-stream',
-                    'Cache-Control': 'no-cache',
-                    'Connection': 'keep-alive',
-                },
-            });
-        } else {
-            const result = await getEddifyAgent().generate(enrichedPrompt);
-            const usage: any = result.usage;
+        try {
+            if (stream) {
+                return await streamOpenAIResponse(c, getEddifyAgent(), messages, model);
+            } else {
+                const result = await getEddifyAgent().generate(messages);
+                const usage: any = result.usage;
+                // ... (rest of non-stream response)
+            }
+        } catch (error: any) {
+            console.error('[Gateway] Inference Error:', error);
+            return c.json({
+                error: { message: error.message || 'Internal Server Error', type: 'server_error', code: 500 }
+            }, 500);
+        }
```

---

## What We Intentionally Do NOT Change

| Concern | Decision |
|---|---|
| `x-openclaw-agent-id` header | **Not needed** — gateway only serves one model |

---

## Verification Plan

### Automated Tests
```bash
cd /Users/dev/Projects/goodshepherdinsights-router && npx vitest run
```

### Manual Verification (both formats)

**String content (curl):**
```bash
curl https://api.goodshepherdinsights.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <KEY>" \
  -d '{"model":"eddify-alpha","messages":[{"role":"user","content":"Hello"}]}'
```

**Array content (OpenClaw format) with Conversation History:**
```bash
curl https://api.goodshepherdinsights.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <KEY>" \
  -d '{"model":"eddify-alpha","messages":[{"role":"developer","content":"You are helpful"},{"role":"user","content":"Hi my name is John"}, {"role":"assistant","content":"Hello John!"}, {"role":"user","content":[{"type":"text","text":"What is my name?"}]}]}'
```
*Expectation: Response should correctly identify the name "John" due to retained conversation history, proving multi-turn works.*

**Streaming (SSE format):**
```bash
curl -N https://api.goodshepherdinsights.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <KEY>" \
  -d '{"model":"eddify-alpha","messages":[{"role":"user","content":[{"type":"text","text":"Hello"}]}],"stream":true}'
```
