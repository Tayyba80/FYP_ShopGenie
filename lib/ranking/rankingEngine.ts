// lib/ranking/rankingEngine.ts

import { Product, RankedProduct } from '../../types/product';
import { ConstraintExtractor, UserConstraints } from './constraintExtractor';
import { ProductScorer, ScoringResult } from './productScorer';

export interface RankingOptions {
  topN?: number;           // number of products to return (default 5)
  minScore?: number;       // minimum score threshold (default 0.1)
  filterDisqualified?: boolean; // remove products with score 0 (default true)
}

export class RankingEngine {
  private scorer: ProductScorer;

  constructor(scorerConfig?: Partial<import('./productScorer').ScorerConfig>) {
    this.scorer = new ProductScorer(scorerConfig);
  }

  /**
   * Rank products based on user query.
   */
  async rankProducts(
    products: Product[],
    userQuery: string,
    options: RankingOptions = {}
  ): Promise<RankedProduct[]> {
    const {
      topN = 5,
      minScore = 0.1,
      filterDisqualified = true,
    } = options;

    // 1. Extract constraints from query
    const extractor = new ConstraintExtractor(userQuery);
    const constraints = await extractor.extract();

    // 2. Score all products concurrently
    const scoringPromises = products.map(product =>
      this.scorer.scoreProduct(product, constraints)
    );
    const scoredProducts = await Promise.all(scoringPromises);

    // 3. Combine product with scoring result
    const combined = scoredProducts.map((scoreResult, index) => ({
      product: products[index],
      scoring: scoreResult,
    }));

    // 4. Filter out disqualified/low-score products
    const eligible = combined.filter(item => {
      if (filterDisqualified && item.scoring.score === 0) return false;
      if (item.scoring.score < minScore) return false;
      return true;
    });

    // 5. Sort by score descending
    eligible.sort((a, b) => b.scoring.score - a.scoring.score);

    // 6. Take top N and build final ranked products
    const topProducts = eligible.slice(0, topN).map(item => {
      const reason = this.generateRankingReason(item.product, item.scoring, constraints);
      return {
        product: item.product,
        score: item.scoring.score,
        breakdown: item.scoring.breakdown,
        matchingFeatures: item.scoring.matchingFeatures,
        sentimentSummary: item.scoring.sentimentSummary,
        rankingReason: reason,
      };
    });

    return topProducts;
  }

  /**
   * Generate a human‑readable explanation for why a product was ranked highly.
   */
  private generateRankingReason(
    product: Product,
    scoring: ScoringResult,
    constraints: UserConstraints
  ): string {
    const parts: string[] = [];

    // Price fit
    if (constraints.minPrice !== undefined || constraints.maxPrice !== undefined) {
      parts.push(`Price ₹${product.price.amount} fits your budget`);
    }

    // Feature matches
    if (scoring.matchingFeatures.length > 0) {
      const featureList = scoring.matchingFeatures.slice(0, 3).join(', ');
      const more = scoring.matchingFeatures.length > 3
        ? ` +${scoring.matchingFeatures.length - 3} more`
        : '';
      parts.push(`Matches: ${featureList}${more}`);
    }

    // Sentiment summary (with confidence)
    const pos = scoring.sentimentSummary.positive;
    const neg = scoring.sentimentSummary.negative;
    const total = pos + neg + scoring.sentimentSummary.neutral;
    if (total > 0) {
      const posPercent = Math.round((pos / total) * 100);
      const conf = Math.round(scoring.sentimentSummary.confidence * 100);
      parts.push(`${posPercent}% positive reviews (${conf}% confidence)`);
    }

    // Rating info
    if (product.rating.count > 0) {
      parts.push(`Rated ${product.rating.average.toFixed(1)}★ (${product.rating.count} reviews)`);
    }

    // Credibility note if score was reduced
    if (scoring.breakdown.credibilityFactor < 0.8) {
      if (scoring.sentimentSummary.spamRatio > 0.2) {
        parts.push(`Some spam filtered`);
      } else {
        parts.push(`Credibility check applied`);
      }
    }

    // If product had missing must‑have features (score would be 0, but if we kept it, note why)
    if (scoring.missingMustHaveFeatures.length > 0) {
      parts.push(`Missing must‑have: ${scoring.missingMustHaveFeatures.join(', ')}`);
    }

    return parts.join(' · ');
  }
}