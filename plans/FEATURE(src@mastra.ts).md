# Feature Plan: Enterprise Strategy Routing Harness (`src/mastra/harness/`)

## Objective
An enterprise-grade dynamic pre-processing architecture for `eddify-alpha` using the **Strategy & Registry Design Patterns**, with a fully decoupled Configuration Layer that extracts all hardcoded strings, patterns, and directives into a single source of truth.

---

## Directory Structure

```
src/mastra/harness/
├── harness.config.ts   ← All string constants, directive payloads, and regex patterns
├── types.ts            ← IHarnessStrategy interface definition
├── strategies.ts       ← Concrete Strategy implementations
├── Registry.ts         ← HarnessRegistry singleton
└── index.ts            ← Clean public barrel export
```

---

## Phase 1: Configuration Layer

**File Target:** `src/mastra/harness/harness.config.ts`
**Justification:** All string literals—including strategy IDs, classification patterns, and persona/directive payloads—are owned exclusively by this file. Changing a directive or adding a new keyword requires a single-file edit with zero side effects on the runtime logic.

```typescript
/**
 * Strategy ID declarations. Consumed by concrete strategy classes.
 * Using string enums provides type safety without needing explicit integer mapping.
 */
export enum StrategyId {
    DEVELOPMENT = 'STRATEGY_DEVELOPMENT',
    RESEARCH    = 'STRATEGY_RESEARCH',
    GENERAL     = 'STRATEGY_GENERAL',
}

/**
 * Classification heuristic patterns mapped to each strategy.
 */
export const CLASSIFICATION_PATTERNS: Record<StrategyId, RegExp | null> = {
    [StrategyId.DEVELOPMENT]: /\b(code|typescript|react|debug|refactor|error|api|test|script|sql|git)\b/i,
    [StrategyId.RESEARCH]:    /\b(why|explain|research|analyze|history|what is|how does|compare|statistics)\b/i,
    [StrategyId.GENERAL]:     null, // Fallback — always accepts
};

/**
 * Base persona applied to every interaction.
 */
export const CORE_PERSONA = `You are Eddify, an advanced reasoning assistant powered by Good Shepherd Insights.`;

/**
 * Directive string payloads mapped by StrategyId.
 */
export const HARNESS_DIRECTIVES: Record<StrategyId, string> = {
    [StrategyId.DEVELOPMENT]: `
[ DIRECTIVE: DEVELOPMENT ]
- Provide production-ready, highly optimized code.
- Include JSDoc comments and prioritize TypeScript safety.
- Suppress conversational filler.
    `.trim(),

    [StrategyId.RESEARCH]: `
[ DIRECTIVE: RESEARCH ]
- Structure arguments coherently with clear headers.
- State "I do not have enough verified data." when uncertain.
- Prioritize objectivity over brevity.
    `.trim(),

    [StrategyId.GENERAL]: `
[ DIRECTIVE: GENERAL ASSISTANT ]
- Assist the user politely and concisely.
    `.trim(),
};

/** Separator used before the user query block */
export const QUERY_SEPARATOR = '---\nUSER QUERY:';
```

---

## Phase 2: Strategy Interface

**File Target:** `src/mastra/harness/types.ts`

```typescript
export interface IHarnessStrategy {
    readonly id: string;
    canHandle(prompt: string): boolean;
    apply(prompt: string): string;
}
```

---

## Phase 3: Concrete Strategy Implementations

**File Target:** `src/mastra/harness/strategies.ts`
**Justification:** Strategy classes consume exclusively from `harness.config.ts`. No string literals exist within this file.

```typescript
import { IHarnessStrategy } from './types.js';
import {
    StrategyId,
    CLASSIFICATION_PATTERNS,
    CORE_PERSONA,
    HARNESS_DIRECTIVES,
    QUERY_SEPARATOR
} from './harness.config.js';

function buildPrompt(strategyId: StrategyId, prompt: string): string {
    return `${CORE_PERSONA}\n${HARNESS_DIRECTIVES[strategyId]}\n\n${QUERY_SEPARATOR}\n${prompt}`;
}

export class DevelopmentStrategy implements IHarnessStrategy {
    public readonly id = StrategyId.DEVELOPMENT;
    public canHandle(prompt: string): boolean {
        return CLASSIFICATION_PATTERNS[StrategyId.DEVELOPMENT]!.test(prompt);
    }
    public apply(prompt: string): string {
        return buildPrompt(StrategyId.DEVELOPMENT, prompt);
    }
}

export class ResearchStrategy implements IHarnessStrategy {
    public readonly id = StrategyId.RESEARCH;
    public canHandle(prompt: string): boolean {
        return CLASSIFICATION_PATTERNS[StrategyId.RESEARCH]!.test(prompt);
    }
    public apply(prompt: string): string {
        return buildPrompt(StrategyId.RESEARCH, prompt);
    }
}

export class DefaultStrategy implements IHarnessStrategy {
    public readonly id = StrategyId.GENERAL;
    public canHandle(): boolean { return true; }
    public apply(prompt: string): string {
        return buildPrompt(StrategyId.GENERAL, prompt);
    }
}
```

---

## Phase 4: The Harness Registry

**File Target:** `src/mastra/harness/Registry.ts`

```typescript
import { IHarnessStrategy } from './types.js';
import { DevelopmentStrategy, ResearchStrategy, DefaultStrategy } from './strategies.js';

export class HarnessRegistry {
    // Order defines heuristic evaluation precedence
    private strategies: IHarnessStrategy[] = [
        new DevelopmentStrategy(),
        new ResearchStrategy(),
        new DefaultStrategy(), // Must remain last (fallback)
    ];

    public routePayload(prompt: string): string {
        for (const strategy of this.strategies) {
            if (strategy.canHandle(prompt)) {
                return strategy.apply(prompt);
            }
        }
        return prompt; // Failsafe — DefaultStrategy should always claim this
    }
}

export const harnessRouter = new HarnessRegistry();
```

---

## Phase 5: Public Barrel Export

**File Target:** `src/mastra/harness/index.ts`

```typescript
export { harnessRouter } from './Registry.js';
export { StrategyId } from './harness.config.js';
export type { IHarnessStrategy } from './types.js';
```

---

## Phase 6: Route Hook Injection

**File Target:** `src/routes/chat.ts`

```typescript
import { harnessRouter } from '../mastra/harness/index.js';

// ... (around line 34) ...
const rawPrompt = messages[messages.length - 1]?.content || '';
const enrichedPrompt = harnessRouter.routePayload(rawPrompt);

// Pass enrichedPrompt into stream() and generate() calls
```

---

## Next Steps
Review and approve to proceed with implementation.
