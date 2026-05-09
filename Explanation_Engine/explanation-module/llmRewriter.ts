// backend/explanation-module/llmRewriter.ts
import { config } from './config';

// Type for GROQ API response
interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class LLMRewriter {
  private apiKey: string;
  private apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  private requestCount = 0;

  constructor() {
    this.apiKey = config.groqApiKey;
    if (!this.apiKey || !config.useLLM) {
      console.log('ℹ️ LLM disabled: Missing API key or USE_LLM=false');
    } else {
      console.log(`✅ LLM enabled with model: ${config.llmModel}`);
    }
  }

  async rewrite(productName: string, platform: string, factualBullets: string): Promise<string | null> {
    if (!this.apiKey || !config.useLLM) return null;

    const prompt = `Product: ${productName}
Platform: ${platform}

Facts about this product:
${factualBullets}

Write 2 natural sentences using ONLY these facts. Do not add any new information. Be conversational:`;

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.llmModel,
          messages: [
            { role: 'system', content: 'You rewrite facts naturally. Never add or change information.' },
            { role: 'user', content: prompt },
          ],
          temperature: config.llmTemperature,
          max_tokens: config.llmMaxTokens,
        }),
      });

      if (!response.ok) {
        console.error(`GROQ API error: ${response.status}`);
        return null;
      }

      const data = (await response.json()) as GroqResponse;
      const result = data.choices?.[0]?.message?.content;
      if (result) {
        this.requestCount++;
        return result.trim();
      }
      return null;
    } catch (error) {
      console.error('GROQ API error:', error);
      return null;
    }
  }
}