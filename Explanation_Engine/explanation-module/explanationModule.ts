// backend/explanation-module/explanationModule.ts
import { RankedProduct, ExplanationOutput } from './types';
import { FactExtractor } from './factExtractor';
import { LLMRewriter } from './llmRewriter';
import { ProductCardBuilder } from './productCardBuilder';
import { config } from './config';

export class ShopGenieExplanationModule {
  private factExtractor: FactExtractor;
  private llmRewriter: LLMRewriter;
  private cardBuilder: ProductCardBuilder;
  private stats = { total: 0, llmSuccess: 0 };

  constructor() {
    this.factExtractor = new FactExtractor();
    this.llmRewriter = new LLMRewriter();
    this.cardBuilder = new ProductCardBuilder();
  }

  async process(query: string, rankedProducts: RankedProduct[]): Promise<ExplanationOutput> {
    const productsToProcess = rankedProducts.slice(0, 6);
    const totalReceived = rankedProducts.length;

    console.log(`📊 Processing ${productsToProcess.length} products (received ${totalReceived})`);

    const productCards = [];
    for (let i = 0; i < productsToProcess.length; i++) {
      const rp = productsToProcess[i];
      const rank = i + 1;
      console.log(`   🔍 Processing product #${rank}: ${rp.product.title.substring(0, 40)}...`);

      const facts = this.factExtractor.extractFacts(rp);
      const bulletString = this.factExtractor.toBulletString(facts);

      let llmText: string | null = null;
      if (config.useLLM) {
        llmText = await this.llmRewriter.rewrite(rp.product.title, rp.product.platform, bulletString);
      }

      const card = this.cardBuilder.build(rp, rank, facts, llmText);
      productCards.push(card);

      this.stats.total++;
      if (llmText) this.stats.llmSuccess++;
    }

    const chatResponse = this.buildChatResponse(query, productCards);
    const suggestedFollowups = this.getFollowups(productCards, query);

    return {
      query,
      timestamp: new Date().toISOString(),
      totalProducts: productCards.length,
      totalFound: totalReceived,
      chatResponse,
      productCards,
      suggestedFollowups,
      stats: {
        productsProcessed: this.stats.total,
        llmSuccessCount: this.stats.llmSuccess,
        llmSuccessRate: `${((this.stats.llmSuccess / Math.max(1, this.stats.total)) * 100).toFixed(1)}%`,
      },
    };
  }

  private buildChatResponse(query: string, cards: ExplanationOutput['productCards']): string {
    if (cards.length === 0) {
      return `Sorry, no products found for '${query}'. Try a different search!`;
    }

    let response = cards.length === 1
      ? `🔍 I found 1 great option for '${query}'!\n\n`
      : `🔍 I found ${cards.length} great options for '${query}'!\n\n`;

    const top = cards[0];
    response += `🏆 **Top pick**: ${top.name}\n`;
    response += `   • ${top.price.display} | ⭐ ${top.rating.display}\n`;
    if (top.keyFeatures.length) {
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
    const platforms = new Set(cards.map(c => c.platform.name));
    if (platforms.size > 1) {
      followups.push(`Show only ${Array.from(platforms)[0]} products`);
    }
    return followups.slice(0, 5);
  }
}