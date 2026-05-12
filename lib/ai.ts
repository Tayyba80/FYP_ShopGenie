// lib/ai.ts
import { RankingEngine } from '@/lib/ranking/rankingEngine';
import { ConstraintExtractor } from '@/lib/ranking/constraintExtractor';
import { getKnowledgeCache, setKnowledgeDb } from '@/lib/ranking/knowledgeCache';
import { ShopGenieExplanationModule } from '@/lib/explanation-module/explanationModule';
import { prisma } from '@/lib/prisma';

import type { ExplanationOutput } from '@/types/product';           
import { parseIntent } from '@/lib/search-query/query/intentParser';
import { retrieveProducts } from '@/lib/search-query/scrappers/orchestrator';

setKnowledgeDb(prisma);

// ── Greeting detection ──────────────────────────────────────────
function isGreeting(message: string): boolean {
  const greetings = [
    'hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon',
    'good evening', 'howdy', "what's up", 'sup', 'yo', 'hola', 'hi there',
    'morning', 'evening', 'afternoon',
  ];
  const lower = message.toLowerCase().trim();
  return greetings.some((g) => lower === g || lower.startsWith(g));
}

export async function getAIResponse(
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<ExplanationOutput | string> {
  
  const lastUserMsg = [...history].reverse().find((m) => m.role === 'user');
  if (!lastUserMsg) {
    return "I'm your AI shopping assistant. What product can I help you find today?";
  }

  const query = lastUserMsg.content.trim();

  if (isGreeting(query)) {
    return "Hello! 👋 I'm ShopGenie, your personal AI shopping assistant. I can compare products across multiple stores and find the best deals for you!";
  }

  try {
    // === Query Processing & Retrieval ===
    const intent = parseIntent(query);
    console.log("Parsed Intent:", intent);           // Debug only

    const result = await retrieveProducts(intent);
    console.log(`✅ Found ${result.products.length} products`);
    console.log(`Sources Success:`, result.sourcesSucess);
    console.log(`Sources Failed:`, result.sourcesFailed);

    if (result.products.length === 0) {
      return `Sorry, I couldn't find any matching products for "${query}".\n\nTry something like:\n• "Samsung headphones under 50000"\n• "gaming laptop i7 16gb ram"`;
    }

    if (result.sourcesFailed.length > 0) {
      console.warn("Some scraping sources failed:", result.sourcesFailed);
    }

    // === Ranking & Explanation Pipeline ===
    const cache = getKnowledgeCache();
    if (cache.getBrands().length === 0) {
      await cache.loadFromDb();
    }

    await cache.learnFromProducts(result.products);

    ConstraintExtractor.setKnownBrands(cache.getBrands());
    ConstraintExtractor.initializeCanonicalFeatures(cache.getFeatures());

    const engine = new RankingEngine();
    const ranked = await engine.rankProducts(result.products, query);

    const explainer = new ShopGenieExplanationModule();
    const explanation: ExplanationOutput = await explainer.process(query, ranked);

    return explanation;

  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return "I'm having trouble connecting to the stores right now. Please try again in a moment.";
  }
}