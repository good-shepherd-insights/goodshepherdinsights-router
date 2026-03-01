import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import { initMastra } from './mastra/index.js';
import { coreRoutes, chatRoutes } from './routes/index.js';

const app = new Hono();

// Mount externalized routes
app.route('/', coreRoutes);
app.route('/', chatRoutes);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize Mastra backend before starting the server process
initMastra().then(() => {
  console.log('✅ Mastra and EddifyAgent successfully initialized.');
  serve(
    {
      fetch: app.fetch,
      port: PORT,
    },
    (info) => {
      console.log(`🤖 Good Shepherd Model Gateway running on http://localhost:${info.port}`);
      console.log(`\nAvailable endpoints:`);
      console.log(`  GET  http://localhost:${info.port}/health`);
      console.log(`  GET  http://localhost:${info.port}/v1/models`);
      console.log(`  POST http://localhost:${info.port}/v1/chat/completions\n`);
    },
  );
}).catch((err) => {
  console.error("❌ Failed to initialize Mastra or start server: ", err);
  process.exit(1);
});
