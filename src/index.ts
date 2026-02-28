import 'dotenv/config';
import { serve } from '@hono/node-server';
import { mastra } from './mastra/index.js';

const router = mastra.getRouter();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

serve(
  {
    fetch: router.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`\n🤖 Eddify agent server running on http://localhost:${info.port}`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  GET  http://localhost:${info.port}/api/agents`);
    console.log(`  GET  http://localhost:${info.port}/api/agents/eddify`);
    console.log(`  POST http://localhost:${info.port}/api/agents/eddify/generate`);
    console.log(`  POST http://localhost:${info.port}/api/agents/eddify/stream`);
    console.log(`  GET  http://localhost:${info.port}/api/agents/eddify/memory/threads`);
    console.log(`  POST http://localhost:${info.port}/api/agents/eddify/memory/threads\n`);
  },
);
