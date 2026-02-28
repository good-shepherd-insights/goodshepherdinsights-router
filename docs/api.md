# Good Shepherd Model Gateway - API Documentation

This document describes the OpenAI-compatible API exposed by the Good Shepherd Model Gateway.

## Overview

The gateway exposes a REST API that is compatible with the OpenAI Chat Completions API. This allows you to use the gateway with any OpenAI-compatible client.

## Base URL

```
http://localhost:3000
```

## Authentication

All API requests require a Bearer token in the `Authorization` header:

```bash
Authorization: Bearer <your-gateway-api-key>
```

The default API key is `your-gateway-api-key` unless changed via the `GATEWAY_API_KEY` environment variable.

## Endpoints

### POST /v1/chat/completions

Creates a chat completion for the given messages.

**Request:**

```json
{
  "model": "gpt-4o",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "temperature": 1,
  "max_tokens": 1000,
  "stream": false
}
```

**Response:**

```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking. How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 20,
    "total_tokens": 70
  }
}
```

### GET /v1/models

Lists available models/providers.

**Response:**

```json
{
  "object": "list",
  "data": [
    {
      "id": "local",
      "object": "model",
      "created": 1234567890,
      "owned_by": "goodshepherd"
    },
    {
      "id": "openai",
      "object": "model",
      "created": 1234567890,
      "owned_by": "goodshepherd"
    },
    {
      "id": "openrouter",
      "object": "model",
      "created": 1234567890,
      "owned_by": "goodshepherd"
    },
    {
      "id": "anthropic",
      "object": "model",
      "created": 1234567890,
      "owned_by": "goodshepherd"
    }
  ]
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "gateway": "Good Shepherd Insights Router"
}
```

## Example Usage

### cURL - Non-Streaming

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-gateway-api-key" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'
```

### cURL - Streaming

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-gateway-api-key" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "stream": true
  }'
```

### JavaScript

```javascript
const response = await fetch('http://localhost:3000/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-gateway-api-key'
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: 'Hello, how are you?' }
    ]
  })
});

const data = await response.json();
console.log(data);
```

## Error Responses

### 401 - Unauthorized

```json
{
  "error": {
    "message": "Missing or invalid authorization header",
    "type": "invalid_request_error",
    "param": null,
    "code": "missing_authorization"
  }
}
```

### 400 - Bad Request

```json
{
  "error": {
    "message": "Missing or invalid messages array",
    "type": "invalid_request_error",
    "param": "messages",
    "code": "missing_messages"
  }
}
```

### 500 - Internal Server Error

```json
{
  "error": {
    "message": "Internal server error",
    "type": "internal_error",
    "param": null,
    "code": "internal_error"
  }
}
```

## Request Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| model | string | No | gpt-4o | Model identifier |
| messages | array | Yes | - | Array of message objects |
| temperature | number | No | 1 | Sampling temperature (0-2) |
| max_tokens | number | No | - | Maximum tokens to generate |
| stream | boolean | No | false | Enable streaming responses |
| top_p | number | No | 1 | Nucleus sampling parameter |
| n | number | No | 1 | Number of completions to generate |
| stop | string/array | No | - | Stop sequences |

## Message Format

Messages should follow the OpenAI format:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "System prompt"
    },
    {
      "role": "user",
      "content": "User message"
    },
    {
      "role": "assistant",
      "content": "Assistant response"
    }
  ]
}
```
