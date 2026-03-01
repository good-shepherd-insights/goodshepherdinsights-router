# Local Models Configuration

This guide explains how to configure the Good Shepherd Model Gateway to work with local self-hosted models.

## Overview

The gateway supports connecting to local model servers that expose OpenAI-compatible APIs, including:

- **vLLM** - High-performance LLM inference server
- **Ollama** - Local LLM runtime
- **TGI (Text Generation Inference)** - Hugging Face's inference server
- **Custom servers** - Any server implementing the OpenAI Completions API

## Configuration

### Environment Variables

Set the following environment variables to configure the gateway for your local model:

```bash
# Gateway authentication
GATEWAY_API_KEY=your-secure-api-key

# Local model server configuration
MODEL_BASE_URL=http://localhost:8000/v1
LOCAL_MODEL_API_KEY=local-key

# Default model to use
DEFAULT_MODEL=your-model-name
```

### vLLM Setup

To use vLLM as your model backend:

1. **Start vLLM server:**

```bash
vllm serve <model-name> --tensor-parallel-size <num-gpus>
```

By default, vLLM exposes the API at `http://localhost:8000/v1`.

2. **Configure the gateway:**

```bash
MODEL_BASE_URL=http://localhost:8000/v1
LOCAL_MODEL_API_KEY=EMPTY  # vLLM doesn't require API key by default
DEFAULT_MODEL=<model-name>
```

### Ollama Setup

To use Ollama as your model backend:

1. **Start Ollama server:**

```bash
ollama serve
```

Ollama exposes the API at `http://localhost:11434/v1`.

2. **Configure the gateway:**

```bash
MODEL_BASE_URL=http://localhost:11434/v1
LOCAL_MODEL_API_KEY=ollama  # Any string works
DEFAULT_MODEL=llama2  # or other model name
```

### TGI Setup

To use Hugging Face TGI as your model backend:

1. **Start TGI server:**

```bash
text-generation-launcher --model-id <model-name>
```

By default, TGI exposes the API at `http://localhost:8080/v1`.

2. **Configure the gateway:**

```bash
MODEL_BASE_URL=http://localhost:8080/v1
LOCAL_MODEL_API_KEY=EMPTY  # TGI doesn't require API key by default
DEFAULT_MODEL=<model-name>
```

## Testing Local Models

### Health Check

```bash
curl http://localhost:3000/health
```

### List Models

```bash
curl http://localhost:3000/v1/models \
  -H "Authorization: Bearer your-gateway-api-key"
```

### Test Completion

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-gateway-api-key" \
  -d '{
    "model": "your-model-name",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'
```

## Model Selection

The gateway determines which provider to use based on the model ID prefix:

| Model Prefix | Provider |
|--------------|----------|
| `openai/` or `gpt-*` or `o1-*` | OpenAI |
| `anthropic/` or `claude-*` | Anthropic |
| `openrouter/` | OpenRouter |
| Default (no prefix) | Local |

### Examples:

```bash
# Use local model (default)
DEFAULT_MODEL=llama2

# Use OpenAI model
DEFAULT_MODEL=gpt-4o

# Use Anthropic model  
DEFAULT_MODEL=claude-3-5-sonnet
```

## Troubleshooting

### Connection refused

- Ensure your local model server is running
- Check the `MODEL_BASE_URL` is correct
- Verify the port number matches your server

### Authentication errors

- Check `LOCAL_MODEL_API_KEY` matches your server's requirements
- Some servers require a specific API key or allow empty keys

### Model not found

- Verify the model name is correct
- Ensure the model is loaded in your local server

### Timeout errors

- Increase timeout settings in your model server
- Check network connectivity to the local server

## Security Considerations

When running local models in production:

1. **Use a secure API key** - Set a strong `GATEWAY_API_KEY`
2. **Network isolation** - Run on a private network if possible
3. **Firewall rules** - Restrict access to the gateway port
4. **HTTPS** - Consider using a reverse proxy for TLS termination
