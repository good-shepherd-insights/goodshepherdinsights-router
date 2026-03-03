# Fix: OpenClaw Compatibility for Good Shepherd Gateway

OpenClaw sends requests differently than raw curl. Research identified **4 compatibility gaps** that must be addressed.

---

## Gap Analysis

### 1. Content Format — `string` vs `object[]`

**Current code** (chat.ts:40):
```typescript
const rawPrompt = messages[messages.length - 1]?.content || '';
```

**curl sends:** `"content": "Hello"`
**OpenClaw sends:** `"content": [{ "type": "text", "text": "Hello" }]`

Both are valid per the OpenAI spec. The gateway currently receives `[object Object]` from OpenClaw.

---

### 2. `developer` Role — Silently Dropped

OpenClaw sends its system prompt (AGENTS.md, SOUL.md, TOOLS.md) using the `developer` role, not `system`. The gateway currently only extracts the **last message's content** and ignores all system/developer context. This means:
- OpenClaw's personality/instructions are completely lost
- Only the raw user query reaches the agent

> [!IMPORTANT]
> Since the gateway injects its **own** persona via the harness strategy system (`CORE_PERSONA` + `HARNESS_DIRECTIVES`), we should **intentionally discard** OpenClaw's `developer`/`system` messages and let the harness own the persona. This is the correct behavior — Eddify has its own identity. However, we must still handle the role gracefully (no crashes, no `[object Object]`).

---

### 3. Streaming Response Format — Broken SSE

**Current code** (chat.ts:46-53):
```typescript
const streamResult = await getEddifyAgent().stream(enrichedPrompt);
return new Response(streamResult.textStream as any, { ... });
```

This pipes raw text chunks. **OpenClaw expects** proper OpenAI SSE format:
```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{"role":"assistant"},"index":0}]}\n\n
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{"content":"Hello"},"index":0}]}\n\n
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","choices":[{"delta":{},"index":0,"finish_reason":"stop"}]}\n\n
data: [DONE]\n\n
```

Without this format, OpenClaw's streaming will break or show nothing.

---

### 4. Multiple User Messages — Only Last Extracted

OpenClaw sends full conversation history (multiple `user`/`assistant` turns). The gateway only grabs the last message. This is acceptable for a stateless single-turn agent, but we should extract text correctly from whichever message we pick.

---

## Proposed Changes

### Chat Route

#### [MODIFY] [chat.ts](file:///Users/dev/Projects/goodshepherdinsights-router/src/routes/chat.ts)

**A) Add content normalizer** (handles string and array-of-objects):

```typescript
function extractTextContent(content: unknown): string {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text)
            .join('\n');
    }
    return '';
}
```

**B) Replace raw content extraction** (line 40):

```diff
-const rawPrompt = messages[messages.length - 1]?.content || '';
+// Extract the last user message, skipping developer/system/assistant roles
+const lastUserMsg = [...messages].reverse().find((m: any) => m.role === 'user');
+const rawPrompt = extractTextContent(lastUserMsg?.content ?? '');
```

**C) Rewrite streaming to emit proper SSE `chat.completion.chunk`** (lines 45-53):

```typescript
if (stream) {
    const streamResult = await getEddifyAgent().stream(enrichedPrompt);
    const chatId = `chatcmpl-${Date.now()}`;
    const encoder = new TextEncoder();

    const sseStream = new ReadableStream({
        async start(controller) {
            // Initial chunk with role
            controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                    id: chatId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model,
                    choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }]
                })}\n\n`
            ));

            for await (const chunk of streamResult.textStream) {
                controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({
                        id: chatId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model,
                        choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }]
                    })}\n\n`
                ));
            }

            // Terminal chunk
            controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({
                    id: chatId, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model,
                    choices: [{ index: 0, delta: {}, finish_reason: 'stop' }]
                })}\n\n`
            ));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
        }
    });

    return new Response(sseStream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
```

---

## What We Intentionally Do NOT Change

| Concern | Decision |
|---|---|
| OpenClaw `developer`/`system` messages | **Discarded** — Eddify owns its persona via the harness |
| Conversation history (multi-turn) | **Ignored** — Eddify is stateless single-turn by design |
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

**Array content (OpenClaw format):**
```bash
curl https://api.goodshepherdinsights.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <KEY>" \
  -d '{"model":"eddify-alpha","messages":[{"role":"developer","content":"You are helpful"},{"role":"user","content":[{"type":"text","text":"Hello from OpenClaw"}]}]}'
```

**Streaming (SSE format):**
```bash
curl -N https://api.goodshepherdinsights.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <KEY>" \
  -d '{"model":"eddify-alpha","messages":[{"role":"user","content":[{"type":"text","text":"Hello"}]}],"stream":true}'
```

All three should return proper responses without `[object Object]` or malformed SSE.
