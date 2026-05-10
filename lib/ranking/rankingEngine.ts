import { Product, RankedProduct } from '../../types/product';
import { ConstraintExtractor, UserConstraints } from './constraintExtractor';
import { ProductScorer, ScoringResult } from './productScorer';

export interface RankingOptions {
  topN?: number;
  minScore?: number;
  filterDisqualified?: boolean;
  alwaysReturnAtLeastOne?: boolean;
}

export class RankingEngine {
  private scorer: ProductScorer;

  constructor(scorerConfig?: Partial<import('./productScorer').ScorerConfig>) {
    this.scorer = new ProductScorer(scorerConfig);
  }

  /**
   * Rank products based on user query.
   * Assumes ConstraintExtractor has been initialized with global brand/feature sets.
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
      alwaysReturnAtLeastOne = true,
    } = options;

    if (products.length === 0) return [];

    const extractor = new ConstraintExtractor(userQuery);
    const constraints = await extractor.extract();

    const scoringPromises = products.map(p => this.scorer.scoreProduct(p, constraints));
    const scoredProducts = await Promise.all(scoringPromises);

    const combined = scoredProducts.map((sc, idx) => ({
      product: products[idx],
      scoring: sc,
    }));

    let eligible = combined.filter(item => {
      if (filterDisqualified && item.scoring.score === 0) return false;
      if (item.scoring.score < minScore) return false;
      return true;
    });

    if (eligible.length === 0 && alwaysReturnAtLeastOne && combined.length > 0) {
      const best = combined.reduce((a, b) => (a.scoring.score > b.scoring.score ? a : b));
      eligible = [best];
    }

    eligible.sort((a, b) => b.scoring.score - a.scoring.score);

    const topProducts = eligible.slice(0, topN).map(item =>
      this.buildRankedProduct(item, constraints)
    );

    return topProducts;
  }

  private buildRankedProduct(
    item: { product: Product; scoring: ScoringResult },
    constraints: UserConstraints
  ): RankedProduct {
    const reason = this.generateRankingReason(item.product, item.scoring, constraints);
    return {
      product: item.product,
      score: item.scoring.score,
      breakdown: item.scoring.breakdown,
      matchingFeatures: item.scoring.matchingFeatures,
      missingMustHaveFeatures: item.scoring.missingMustHaveFeatures,
      sentimentSummary: item.scoring.sentimentSummary,
      rankingReason: reason,
    };
  }

  private generateRankingReason(
    product: Product,
    scoring: ScoringResult,
    constraints: UserConstraints
  ): string {
    const parts: string[] = [];

    if (constraints.minPrice !== undefined || constraints.maxPrice !== undefined) {
      parts.push(`Price ₹${product.price.amount} fits your budget`);
    }

    if (scoring.matchingFeatures.length > 0) {
      const featureList = scoring.matchingFeatures.slice(0, 3).join(', ');
      const more = scoring.matchingFeatures.length > 3 ? ` +${scoring.matchingFeatures.length - 3} more` : '';
      parts.push(`Matches: ${featureList}${more}`);
    }

    const pos = scoring.sentimentSummary.positive;
    const neg = scoring.sentimentSummary.negative;
    const total = pos + neg + scoring.sentimentSummary.neutral;
    if (total > 0) {
      const posPercent = Math.round((pos / total) * 100);
      const conf = Math.round(scoring.sentimentSummary.confidence * 100);
      parts.push(`${posPercent}% positive reviews (${conf}% confidence)`);
    }

    if (product.rating.count > 0) {
      parts.push(`Rated ${product.rating.average.toFixed(1)}★ (${product.rating.count} reviews)`);
    }

    if (scoring.breakdown.credibilityFactor < 0.8) {
      if (scoring.sentimentSummary.spamRatio > 0.2) {
        parts.push(`Some spam filtered`);
      } else {
        parts.push(`Credibility check applied`);
      }
    }

    if (scoring.missingMustHaveFeatures.length > 0) {
      parts.push(`Missing must‑have: ${scoring.missingMustHaveFeatures.join(', ')}`);
    }

    return parts.join(' · ');
  }
}