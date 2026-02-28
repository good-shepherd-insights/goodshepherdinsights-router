import { Mastra } from '@mastra/core';
import { eddifyAgent } from './agents/eddify.js';

export const mastra = new Mastra({
  agents: {
    eddify: eddifyAgent,
  },
});
