// lib/explanationmodule/llmRewriter.ts
import { config } from './config';

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

    for (let attempt = 0; attempt <= config.llmMaxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.llmTimeoutMs);

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
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 429) {
          // Rate limited – wait and retry
          const retryAfter = response.headers.get('retry-after');
          const delay = retryAfter ? parseInt(retryAfter, 10) * 1000 : (attempt + 1) * 1000;
          console.warn(`Rate limited, waiting ${delay}ms...`);
          await sleep(delay);
          continue;
        }

        if (!response.ok) {
          console.error(`GROQ API error (attempt ${attempt + 1}): ${response.status}`);
          if (attempt < config.llmMaxRetries) {
            await sleep(1000 * (attempt + 1));
            continue;
          }
          return null;
        }

        const data = (await response.json()) as GroqResponse;
        const result = data.choices?.[0]?.message?.content;
        if (result) {
          this.requestCount++;
          return result.trim();
        }
        return null;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.error(`GROQ request timeout (${config.llmTimeoutMs}ms)`);
        } else {
          console.error('GROQ API error:', error);
        }
        if (attempt < config.llmMaxRetries) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        return null;
      }
    }
    return null;
  }
}