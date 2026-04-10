// lib/ranking/rankingEngine.ts

import { Product, RankedProduct } from '@/types/product';
import { ConstraintExtractor, UserConstraints } from './constraintExtractor';
import { ProductScorer } from './productScorer';

export class RankingEngine {
  private scorer: ProductScorer;

  constructor() {
    this.scorer = new ProductScorer();
  }

  /**
   * Rank products based on user query.
   * Now async because constraint extraction uses ML models.
   */
  async rankProducts(products: Product[], userQuery: string): Promise<RankedProduct[]> {
    // 1. Extract constraints from query (async)
    const extractor = new ConstraintExtractor(userQuery);
    const constraints = await extractor.extract();

    // 2. Score each product
    const scoredProducts = products.map(product => {
      const scoringResult = this.scorer.scoreProduct(product, constraints);
      return {
        product,
        ...scoringResult,
      };
    });

    // 3. Sort by score descending
    scoredProducts.sort((a, b) => b.score - a.score);

    // 4. Take top 5 and build final RankedProduct objects
    const top5 = scoredProducts.slice(0, 5).map(item => {
      const reason = this.generateRankingReason(item, constraints);
      return {
        product: item.product,
        score: item.score,
        breakdown: item.breakdown,
        matchingFeatures: item.matchingFeatures,
        sentimentSummary: item.sentimentSummary,
        rankingReason: reason,
      };
    });

    return top5;
  }

  private generateRankingReason(
    item: {
      product: Product;
      score: number;
      breakdown: any;
      matchingFeatures: string[];
      sentimentSummary: any;
    },
    constraints: UserConstraints
  ): string {
    const parts: string[] = [];

    if (constraints.minPrice !== undefined || constraints.maxPrice !== undefined) {
      parts.push(`Price ₹${item.product.price.amount} within your range`);
    }

    if (item.matchingFeatures.length > 0) {
      parts.push(`matches features: ${item.matchingFeatures.join(', ')}`);
    }

    const pos = item.sentimentSummary.positive;
    const neg = item.sentimentSummary.negative;
    if (pos + neg > 0) {
      const posPercent = Math.round((pos / (pos + neg)) * 100);
      parts.push(`${posPercent}% positive reviews (after spam filter)`);
    }

    if (item.product.rating.count > 0) {
      parts.push(`rated ${item.product.rating.average}★ by ${item.product.rating.count} users`);
    }

    return parts.join('; ');
  }
}