import { Mastra } from '@mastra/core';
import { Agent } from '@mastra/core/agent';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { GoodshepherdModelGateway } from '../gateway/GoodshepherdModelGateway.js';
import { integrityProcessor } from './processors/integrity.processor.js';
import { piiDetector, moderationProcessor } from './processors/native.processors.js';

// The singleton gateway used everywhere
export const gateway = new GoodshepherdModelGateway();

let eddifyAgentInstance: Agent<any, any, any>;
let mastraInstance: Mastra;

export async function initMastra() {
  const provider = createOpenAICompatible({
    name: 'kilocode',
    baseURL: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway',
    apiKey: process.env.KILOCODE_API_KEY || 'MISSING_API_KEY'
  });

  const model = provider('minimax/minimax-m2.5:free');

  eddifyAgentInstance = new Agent({
    name: 'eddify-alpha',
    id: 'eddify-alpha-agent',
    instructions: 'You are Eddify, an advanced reasoning assistant powered by Good Shepherd Insights.',
    model: model as any, // Cast away strict Vercel AI SDK types vs Mastra expected types
    outputProcessors: [
      integrityProcessor,    // 1. Audit + rewrite for honesty, effort, accountability
      piiDetector,           // 2. Redact PII to placeholders from cleaned output
      moderationProcessor,   // 3. Block harmful content last
    ] as any,
  });

  mastraInstance = new Mastra({
    agents: { eddifyAgent: eddifyAgentInstance },
    gateways: {
      goodshepherd: gateway,
    },
  });

  return { mastra: mastraInstance, eddifyAgent: eddifyAgentInstance };
}

export const getEddifyAgent = () => eddifyAgentInstance;
export const getMastra = () => mastraInstance;
