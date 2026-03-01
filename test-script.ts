import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const kilo = createOpenAICompatible({
  name: 'kilo',
  baseURL: 'https://api.kilo.ai/api/gateway',
  apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbnYiOiJwcm9kdWN0aW9uIiwia2lsb1VzZXJJZCI6Im9hdXRoL2dvb2dsZToxMTU2MjM4Njg0Mzg0MDE3MTU2ODQiLCJhcGlUb2tlblBlcHBlciI6bnVsbCwidmVyc2lvbiI6MywiaWF0IjoxNzcyMzgyMjg4LCJleHAiOjE5MzAwNjIyODh9.nIV8RLI4gp0JWwgn3oxqATabgIsxG2x5EHlhv23Mr3M',
});

async function run() {
  try {
    const result = await generateText({
      model: kilo('minimax/minimax-m2.1:free'),
      messages: [{ role: 'user', content: 'Say hello!' }],
    });
    console.log(result.text);
  } catch(e) { console.error('Error:', e); }
}
run();
