export const PROVIDER_REGISTRY = {
  KILOCODE: {
    name: 'kilocode',
    baseURL: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway',
    envKey: 'KILOCODE_API_KEY',
  },
  LOCAL: {
    name: 'local',
    baseURL: process.env.MODEL_BASE_URL || 'http://localhost:8000/v1',
    envKey: 'LOCAL_MODEL_API_KEY',
  }
};
