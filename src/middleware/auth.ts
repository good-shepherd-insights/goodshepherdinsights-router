import { Context, Next } from 'hono';

const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY || 'your-gateway-api-key';

export async function authenticate(c: Context, next: Next) {
    const authHeader = c.req.header('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({
            error: {
                message: 'Missing or invalid authorization header',
                type: 'invalid_request_error',
                param: null,
                code: 'missing_authorization',
            },
        }, 401);
    }

    const token = authHeader.substring(7);
    if (token !== GATEWAY_API_KEY) {
        return c.json({
            error: {
                message: 'Invalid API key',
                type: 'invalid_request_error',
                param: null,
                code: 'invalid_api_key',
            },
        }, 401);
    }

    return next();
}
