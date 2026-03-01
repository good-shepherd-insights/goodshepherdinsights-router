import 'dotenv/config';
import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

async function main() {
    const provider = createOpenAICompatible({
        name: 'kilocode',
        baseURL: process.env.KILOCODE_BASE_URL || 'https://api.kilo.ai/api/gateway',
        apiKey: process.env.KILOCODE_API_KEY || 'MISSING'
    });

    const languageModel = provider('giga-potato');

    console.log("Sending request to giga-potato...");

    try {
        const result = await generateText({
            model: languageModel as any,
            messages: [{ role: 'user', content: 'Say hello!' }]
        });

        console.log("Response:", result.text);
    } catch (error) {
        console.error("Failed:", error);
    }
}

main();
