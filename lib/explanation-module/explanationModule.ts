// lib/explanationmodule/explanationModule.ts
import { RankedProduct, ExplanationOutput } from '../../types/product';
import { FactExtractor } from './factExtractor';
import { LLMRewriter } from './llmRewriter';
import { ProductCardBuilder } from './productCardBuilder';
import { config } from './config';
import { asyncPool } from './utils';

export class ShopGenieExplanationModule {
  private factExtractor: FactExtractor;
  private llmRewriter: LLMRewriter;
  private cardBuilder: ProductCardBuilder;

  constructor() {
    this.factExtractor = new FactExtractor();
    this.llmRewriter = new LLMRewriter();
    this.cardBuilder = new ProductCardBuilder();
  }

  async process(query: string, rankedProducts: RankedProduct[]): Promise<ExplanationOutput> {
    // Input validation
    if (!Array.isArray(rankedProducts) || rankedProducts.length === 0) {
      return {
        query,
        timestamp: new Date().toISOString(),
        totalProducts: 0,
        totalFound: 0,
        chatResponse: "I couldn't find any products for that query.",
        productCards: [],
        suggestedFollowups: [],
        stats: { productsProcessed: 0, llmSuccessCount: 0, llmSuccessRate: '0%' },
      };
    }

    const productsToProcess = rankedProducts.slice(0, 6);

    // Step 1: Extract facts for all products (synchronous, fast)
    const factData = productsToProcess.map((rp, i) => ({
      rp,
      rank: i + 1,
      facts: this.factExtractor.extractFacts(rp),
      bulletString: '',
    }));
    factData.forEach(d => {
      d.bulletString = this.factExtractor.toBulletString(d.facts);
    });

    // Step 2: Call LLM in parallel with concurrency limit
    let llmResults: Array<string | null> = [];
    if (config.useLLM && this.llmRewriter) {
      llmResults = await asyncPool(
        config.llmConcurrency,
        factData,
        async (item) =>
          this.llmRewriter.rewrite(
            item.rp.product.title,
            item.rp.product.platform,
            item.bulletString
          )
      );
    } else {
      llmResults = new Array(factData.length).fill(null);
    }

    // Step 3: Build final cards
    const productCards = factData.map((item, idx) =>
      this.cardBuilder.build(item.rp, item.rank, item.facts, llmResults[idx])
    );

    const llmSuccessCount = llmResults.filter(r => r !== null).length;
    const totalProcessed = productCards.length;
    const llmSuccessRate =
      totalProcessed > 0
        ? `${((llmSuccessCount / totalProcessed) * 100).toFixed(1)}%`
        : '0%';

    const chatResponse = this.buildChatResponse(query, productCards);
    const suggestedFollowups = this.getFollowups(productCards, query);

    return {
      query,
      timestamp: new Date().toISOString(),
      totalProducts: totalProcessed,
      totalFound: rankedProducts.length,
      chatResponse,
      productCards,
      suggestedFollowups,
      stats: {
        productsProcessed: totalProcessed,
        llmSuccessCount,
        llmSuccessRate,
      },
    };
  }

  private buildChatResponse(query: string, cards: ExplanationOutput['productCards']): string {
    if (cards.length === 0) {
      return `Sorry, no products found for '${query}'. Try a different search!`;
    }

    let response =
      cards.length === 1
        ? `🔍 I found 1 great option for '${query}'!\n\n`
        : `🔍 I found ${cards.length} great options for '${query}'!\n\n`;

    const top = cards[0];
    response += `🏆 **Top pick**: ${top.name}\n`;
    response += `   • ${top.price.display} | ⭐ ${top.rating.display}\n`;
    if (top.keyFeatures?.length) {
      response += `   • Features: ${top.keyFeatures.slice(0, 2).join(', ')}\n`;
    }
    if (top.explanation.natural) {
      response += `\n✨ ${top.explanation.natural}\n`;
    }

    if (cards.length > 1) {
      response += `\n📋 Also check out:\n`;
      for (let i = 1; i < Math.min(3, cards.length); i++) {
        const card = cards[i];
        response += `   • ${card.name.substring(0, 35)} — ${card.price.display} | ⭐ ${card.rating.display}\n`;
      }
    }

    response += `\n💡 Scroll down to see all ${cards.length} recommendations with detailed product cards!`;
    return response;
  }

  private getFollowups(cards: ExplanationOutput['productCards'], query: string): string[] {
    const followups: string[] = [];
    if (cards.length >= 2) followups.push('Compare the top 2 products');
    followups.push('Show me cheaper options');
    if (cards[0]?.keyFeatures.length) {
      followups.push(`Tell me more about ${cards[0].keyFeatures[0]}`);
    }
    const prices = cards.map(c => c.price.amount).filter(p => p > 0);
    if (prices.length > 1) {
      const minPrice = Math.min(...prices);
      followups.push(`What's the best value under $${Math.floor(minPrice + 50)}?`);
    }
    const platforms = new Set(cards.map(c => c.platform.code));
    if (platforms.size > 1) {
      followups.push(`Show only ${Array.from(platforms)[0]} products`);
    }
    return followups.slice(0, 5);
  }
}