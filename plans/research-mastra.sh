#!/bin/bash
# Research Mastra package structure
npm info mastra --json 2>/dev/null | head -200
echo "---"
npm info @mastra/core --json 2>/dev/null | head -200
