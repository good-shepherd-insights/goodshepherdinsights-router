# [POST-PROCESSING] Feature Plan: Integrity & Quality Guardrails (`src/mastra/`)

## Problem Statement

The underlying LLM (`minimax-m2.5`) exhibits known failure patterns:
- **Fabrication** — making up facts, citing non-existent sources, false confidence
- **Lazy deflection** — "I can't help with that", "I'm not sure but...", hedging language that avoids the actual problem
- **Low-effort completions** — generic boilerplate that sounds like an answer but doesn't solve anything
- **Non-accountability** — refusing to own wrong output, over-caveating, passive voice evasion

Post-processing must detect these patterns in the raw output and **rewrite** them to meet Eddify's behavioral standards before the response is returned to the user.

---

## Architecture Overview

```
agent.generate(enrichedPrompt)
        │
        ▼
  raw LLM output (potentially dishonest, lazy, or fabricated)
        │
        ▼
┌────────────────────────────┐
│  outputProcessors chain    │
│                            │
│  1. IntegrityProcessor     │  ← Custom: audits + rewrites lazy/dishonest output
│  2. PIIDetector            │  ← Native @mastra/core: redacts PII to placeholders
│  3. ModerationProcessor    │  ← Native @mastra/core: blocks harm (standard categories only)
└────────────────────────────┘
        │
        ▼
  clean, honest, accountable response → user
```

**Execution order matters:**
- Integrity runs first — it rewrites the response to be honest and complete.
- PII runs second — it redacts sensitive data from the already-cleaned response.
- Moderation runs last — it checks the final clean output for harmful content before delivery.

---

## Phase 1: Configuration Layer

**File Target:** `src/mastra/processors/config/processor.config.ts`

```typescript
export enum ProcessorId {
    INTEGRITY   = 'PROCESSOR_INTEGRITY',
    PII         = 'PROCESSOR_PII',
    MODERATION  = 'PROCESSOR_MODERATION',
}

/**
 * The evaluation prompt used by IntegrityProcessor to audit raw LLM output.
 * Instructs the secondary model to detect and rewrite behavioral violations.
 */
export const INTEGRITY_AUDIT_PROMPT = `
You are an integrity auditor for an AI assistant named Eddify.
Review the following AI response and evaluate it against these standards:

FAILURE PATTERNS TO DETECT AND REWRITE:
1. Fabrication — stating facts without basis, false citations, unverifiable claims presented as certain
2. Epistemic cowardice — excessive hedging ("I think", "I believe", "I'm not sure but") that avoids commitment when the answer is knowable
3. Lazy deflection — "I can't help with that", "That's outside my scope", refusing without genuine attempt
4. Low-effort responses — generic boilerplate that sounds relevant but doesn't actually solve the problem
5. Non-accountability — passive evasion, blame-shifting, over-caveating to avoid owning an answer

REWRITE RULES:
- If a claim cannot be verified, state explicitly: "I do not have verified information on this."
- Replace epistemic hedging with direct statements when the answer is clear, or explicit uncertainty when it is not.
- Replace deflection with a genuine attempt to solve the problem, even if partial.
- Replace boilerplate with specific, actionable content relevant to the actual question.
- Maintain the original intent — do not change the subject or expand scope.

Return ONLY the rewritten response. If the response meets all standards already, return it unchanged.
`;

/** Minimum character length before a response is flagged as potentially low-effort */
export const MIN_RESPONSE_LENGTH = 80;
```

---

## Phase 2: IntegrityProcessor (Custom)

**File Target:** `src/mastra/processors/integrity.processor.ts`
**Justification:** Mastra's built-in processors handle harm and PII — they do not handle output quality or behavioral honesty. This custom processor uses the same Kilocode/minimax model to act as a second-pass auditor over the raw output.

```typescript
import type { Processor } from '@mastra/core';
import { ProcessorId, INTEGRITY_AUDIT_PROMPT, MIN_RESPONSE_LENGTH } from './config/processor.config.js';
import { getProcessorModel } from './processor.model.js';
import { generateText } from 'ai';

export const integrityProcessor: Processor = {
    id: ProcessorId.INTEGRITY,
    name: 'Integrity Auditor',

    async processOutputResult({ messages, abort }) {
        const last = messages.at(-1);
        const rawText = last?.content?.[0]?.text ?? '';

        // Short-circuit: if response is too short, flag as low-effort and abort
        if (rawText.trim().length < MIN_RESPONSE_LENGTH) {
            abort('Response did not meet minimum quality threshold (low effort).');
        }

        try {
            // Secondary model call: audit and rewrite
            const { text: rewritten } = await generateText({
                model: getProcessorModel(),
                prompt: `${INTEGRITY_AUDIT_PROMPT}\n\n---\nRESPONSE TO AUDIT:\n${rawText}`,
            });

            if (last?.content?.[0]) {
                last.content[0].text = rewritten;
            }
        } catch {
            // Failsafe: if audit call fails, pass through original rather than crash
        }

        return messages;
    },
};
```

---

## Phase 3: Native Processors (PII + Moderation)

**File Target:** `src/mastra/processors/native.processors.ts`

```typescript
import { ModerationProcessor, PIIDetector } from '@mastra/core';
import { getProcessorModel } from './processor.model.js';

const model = getProcessorModel();

export const piiDetector = new PIIDetector({
    model,
    strategy: 'redact',
    redactionMethod: 'placeholder',    // Replaces with [EMAIL], [PHONE], etc.
    detectionTypes: ['email', 'phone', 'api-key', 'ssn', 'credit-card'],
    structuredOutputOptions: { jsonPromptInjection: true },
});

export const moderationProcessor = new ModerationProcessor({
    model,
    threshold: 0.7,
    strategy: 'block',
    // Standard harm categories only — no custom 'off-topic'
    categories: ['hate', 'harassment', 'violence', 'self-harm', 'sexual'],
    structuredOutputOptions: { jsonPromptInjection: true },
});
```

---

## Phase 4: Shared Model Resolver

**File Target:** `src/mastra/processors/processor.model.ts`

```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export function getProcessorModel() {
    const provider = createOpenAICompatible({
        name: 'kilocode',
        baseURL: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway',
        apiKey: process.env.KILOCODE_API_KEY || 'MISSING_API_KEY',
    });
    return provider('minimax/minimax-m2.5:free');
}
```

---

## Phase 5: Agent Registration

**File Target:** `src/mastra/index.ts`

```typescript
import { integrityProcessor } from './processors/integrity.processor.js';
import { piiDetector, moderationProcessor } from './processors/native.processors.js';

eddifyAgentInstance = new Agent({
    name: 'eddify-alpha',
    id: 'eddify-alpha-agent',
    instructions: '...',
    model: model as any,
    outputProcessors: [
        integrityProcessor,   // 1. Audit + rewrite for honesty, effort, accountability
        piiDetector,          // 2. Redact PII from clean output
        moderationProcessor,  // 3. Block harmful content last
    ],
});
```

---

## Phase 6: Monitor Extension

**File Target:** `src/monitor/monitor.ts`

```typescript
monitor.processorEvent(id: string, action: 'PASSED' | 'REWRITTEN' | 'BLOCKED', detail?: string): void
```

---

## Directory Structure

```
src/mastra/processors/
├── config/
│   └── processor.config.ts     ← ProcessorId enum, audit prompt, min-length threshold
├── processor.model.ts          ← Kilocode model resolver
├── integrity.processor.ts      ← Custom LLM-powered integrity auditor
└── native.processors.ts        ← ModerationProcessor + PIIDetector instances
```

---

## Risk Notes

| Risk | Detail |
|---|---|
| **Latency** | Each processor = 1 extra LLM call. 3 processors = ~3x output latency. Acceptable for `generate()`; for streaming, `processOutputStream` would need per-chunk handling |
| **Model quality loop** | The same model that produced bad output is auditing itself. This is a known limitation — a stronger model could be substituted here in future if budget allows |
| **jsonPromptInjection** | minimax-m2.5 may not support native `response_format`. The `jsonPromptInjection: true` flag is the Mastra-documented fallback |

---

## Next Steps — Awaiting Approval to Implement
