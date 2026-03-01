/**
 * Debug Monitor
 *
 * Centralized, toggleable logging utility for server-side observability.
 * Enable debug output by setting `DEBUG=true` in your `.env` file.
 * In production, leave `DEBUG` unset or set to `false` for silent operation.
 */

const IS_DEBUG = process.env.DEBUG === 'true';

function line(char = '─', len = 45) {
    return char.repeat(len);
}

export const monitor = {
    /**
     * Logs the harness strategy that was selected and the full enriched prompt
     * that will be dispatched to the agent for inference.
     */
    harnessInput(strategyId: string, enrichedPrompt: string): void {
        if (!IS_DEBUG) return;

        console.log(`\n┌${line()}`);
        console.log(`│ 🧠  HARNESS  →  ${strategyId}`);
        console.log(`├${line()}`);
        console.log(`│ 📥  ENRICHED PROMPT`);
        console.log(`├${line()}`);
        enrichedPrompt.split('\n').forEach(l => console.log(`│  ${l}`));
        console.log(`└${line()}\n`);
    },

    /**
     * Logs the raw text output returned by the agent and the token usage breakdown.
     */
    agentOutput(text: string, usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number } = {}): void {
        if (!IS_DEBUG) return;

        const p = usage.inputTokens ?? 0;
        const c = usage.outputTokens ?? 0;
        const t = usage.totalTokens ?? (p + c);

        console.log(`\n┌${line()}`);
        console.log(`│ 📤  AGENT OUTPUT`);
        console.log(`├${line()}`);
        text.split('\n').forEach(l => console.log(`│  ${l}`));
        console.log(`├${line()}`);
        console.log(`│  tokens  →  prompt: ${p}  |  completion: ${c}  |  total: ${t}`);
        console.log(`└${line()}\n`);
    },
};
