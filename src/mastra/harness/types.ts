/**
 * Harness Strategy Interface
 *
 * Defines the immutable contract that all concrete strategy implementations must fulfill.
 * Adheres to the Dependency Inversion Principle — callers depend on this abstraction,
 * not on any specific strategy implementation.
 */
export interface IHarnessStrategy {
    /** Unique identifier for logging, metrics, and observability. */
    readonly id: string;

    /**
     * Heuristic evaluation function.
     * Returns true if this strategy claims responsibility for the given prompt.
     */
    canHandle(prompt: string): boolean;

    /**
     * Applies the strategy's specialized directive payload and constructs
     * the enriched prompt schema ready for agent inference.
     */
    apply(prompt: string): string;
}
