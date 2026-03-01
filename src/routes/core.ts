import { Hono } from 'hono';
import { gateway } from '../mastra/index.js';

const coreRoutes = new Hono();

coreRoutes.get('/health', (c) => {
    return c.json({ status: 'ok', gateway: gateway.name });
});

coreRoutes.get('/v1/models', (c) => {
    return c.json({
        object: 'list',
        data: [{
            id: 'eddify-alpha',
            object: 'model',
            created: Date.now(),
            owned_by: 'goodshepherdinsights',
        }]
    });
});

export default coreRoutes;
