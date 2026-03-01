/**
 * Harness Barrel Export
 *
 * Public API surface for the harness module.
 * Consumers should import exclusively from this entry point.
 */
export { harnessRouter } from './Registry.js';
export { StrategyId } from './config/harness.config.js';
export type { IHarnessStrategy } from './types.js';
