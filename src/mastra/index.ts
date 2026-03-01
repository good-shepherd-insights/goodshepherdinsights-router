import { Mastra, type Config } from '@mastra/core';

/**
 * Mastra instance - currently used for compatibility with Mastra ecosystem.
 * The GoodshepherdModelGateway is used directly in the main application.
 */
export const mastra: Mastra = new Mastra({} as Config);
