import { Agent } from '@mastra/core/agent';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { SOUL_INSTRUCTIONS } from '../instructions/soul.js';
import { IDENTITY_INSTRUCTIONS } from '../instructions/identity.js';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const eddifyAgent = new Agent({
  name: 'eddify',
  instructions: `${SOUL_INSTRUCTIONS}\n\n---\n\n${IDENTITY_INSTRUCTIONS}`,
  model: openrouter('openai/gpt-4o'),
});
