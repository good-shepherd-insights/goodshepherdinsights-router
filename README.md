# Good Shepherd Model Gateway

A Mastra-based model gateway that exposes a correct OpenAI-compatible API layer for both local and hosted models.

## Overview

This gateway provides a unified API to route requests to various LLM providers, including:

- **Local models** (vLLM, Ollama, TGI, custom model servers)
- **Hosted models** (OpenAI, OpenRouter, Anthropic, and any OpenAI-compatible provider)

## Architecture

```
Client Request
     │
     ▼
Good Shepherd Model Gateway (Mastra)
     │
     ├── Local: http://localhost:8000/v1
     ├── OpenAI: https://api.openai.com/v1
     ├── OpenRouter: https://openrouter.ai/api/v1
     └── Anthropic: https://api.anthropic.com/v1
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
GATEWAY_API_KEY=your-secure-api-key
MODEL_BASE_URL=http://localhost:8000/v1
DEFAULT_MODEL=gpt-4o
```

### 3. Run the server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

The server runs on `http://localhost:3000` by default.

## API Endpoints

### POST /v1/chat/completions

Create a chat completion.

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-gateway-api-key" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      { "role": "user", "content": "Hello!" }
    ]
  }'
```

### GET /v1/models

List available models/providers.

```bash
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer your-gateway-api-key"
```

### GET /health

Health check endpoint.

```bash
curl http://localhost:3000/health
```

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GATEWAY_API_KEY` | Yes | - | API key for authentication |
| `MODEL_BASE_URL` | No | `http://localhost:8000/v1` | Local model server URL |
| `DEFAULT_MODEL` | No | `gpt-4o` | Default model to use |
| `OPENAI_API_KEY` | No | - | OpenAI API key |
| `OPENROUTER_API_KEY` | No | - | OpenRouter API key |
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key |
| `PORT` | No | `3000` | Server port |

## Supported Providers

### Local Models

The gateway connects to local model servers via OpenAI-compatible API:

- **vLLM** - `MODEL_BASE_URL=http://localhost:8000/v1`
- **Ollama** - `MODEL_BASE_URL=http://localhost:11434/v1`
- **TGI** - `MODEL_BASE_URL=http://localhost:8080/v1`

### Hosted Models

- **OpenAI** - Use `OPENAI_API_KEY` environment variable
- **OpenRouter** - Use `OPENROUTER_API_KEY` environment variable
- **Anthropic** - Use `ANTHROPIC_API_KEY` environment variable

## Documentation

- [Gateway Contract](docs/gateway-contract.md) - Gateway architecture and integration
- [API Documentation](docs/api.md) - Complete API reference with examples
- [Local Models](docs/local-models.md) - Guide for configuring local models

## Project Structure

```
├── src/
│   ├── index.ts                    # Entry point - HTTP server
│   ├── mastra/
│   │   └── index.ts               # Mastra instance with gateway
│   └── gateway/
│       └── GoodshepherdModelGateway.ts  # Gateway implementation
├── docs/
│   ├── gateway-contract.md        # Gateway architecture
│   ├── api.md                     # API documentation
│   └── local-models.md            # Local model configuration
├── .env.example                   # Environment template
├── package.json
└── tsconfig.json
```

## License

MIT
