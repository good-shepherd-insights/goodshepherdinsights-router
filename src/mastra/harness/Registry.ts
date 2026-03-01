/**
 * Harness Strategy Registry
 *
 * Orchestrates prompt classification and delegates payload construction
 * to the appropriate registered strategy. Adheres strictly to the
 * Open/Closed Principle — new behaviors can be added by registering
 * a new IHarnessStrategy implementation without modifying this class.
 */
import { IHarnessStrategy } from './types.js';
import { DevelopmentStrategy, ResearchStrategy, DefaultStrategy } from './strategies.js';

export class HarnessRegistry {
    /**
     * Ordered strategy chain.
     * Evaluation proceeds sequentially — registration order defines priority.
     * The fallback DefaultStrategy must always be the final entry.
     */
    private readonly strategies: IHarnessStrategy[] = [
        new DevelopmentStrategy(),
        new ResearchStrategy(),
        new DefaultStrategy(), // Fallback — always claims unmatched prompts
    ];

    /**
     * Iterates the registered strategies in priority order and delegates
     * prompt enrichment to the first strategy that claims the input.
     *
     * @param rawPrompt - The raw string prompt from the user's API payload
     * @returns The enriched, directive-wrapped prompt ready for agent inference
     */
    public routePayload(rawPrompt: string): string {
        for (const strategy of this.strategies) {
            if (strategy.canHandle(rawPrompt)) {
                return strategy.apply(rawPrompt);
            }
        }

        // Failsafe: should never be reached if DefaultStrategy is registered
        return rawPrompt;
    }
}

/**
 * Application-scoped singleton; avoids redundant class instantiation
 * across requests. Import and call directly from any route handler.
 */
export const harnessRouter = new HarnessRegistry();
