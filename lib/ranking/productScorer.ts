import { Product } from '../../types/product';
import { UserConstraints } from './constraintExtractor';
import { ReviewAnalyzer, ProductReviewAnalysis } from './reviewAnalyzer';
import { distance as levenshtein } from 'fastest-levenshtein';

export interface ScorerConfig {
  weights: { price: number; rating: number; sentiment: number; feature: number };
  price: { lowerIsBetterBias: number; maxPriceScoreShape: 'linear' | 'exponential' };
  rating: {
    countImportance: number;
    bayesianPriorCount: number;
    bayesianPriorMean: number;
  };
  sentiment: { amplificationPower: number };
  feature: { fuzzyThreshold: number; exactMatchBoost: number };
  credibility: { maxSpamPenalty: number; minUniqueReviewers: number };
  hardConstraints: {
    brandMismatchPenalty: number;
    mustHaveMissingPenalty: number;
    excludedFeaturePenalty: number;   // 0 → disqualified
  };
  recency: { enabled: boolean; decayDays: number };
}

const DEFAULT_CONFIG: ScorerConfig = {
  weights: { price: 0.2, rating: 0.25, sentiment: 0.3, feature: 0.25 },
  price: { lowerIsBetterBias: 0.6, maxPriceScoreShape: 'linear' },
  rating: {
    countImportance: 0.3,
    bayesianPriorCount: 10,
    bayesianPriorMean: 3.5,
  },
  sentiment: { amplificationPower: 1.5 },
  feature: { fuzzyThreshold: 0.8, exactMatchBoost: 1.2 },
  credibility: { maxSpamPenalty: 0.5, minUniqueReviewers: 3 },
  hardConstraints: {
    brandMismatchPenalty: 0.5,
    mustHaveMissingPenalty: 0.7,
    excludedFeaturePenalty: 0.0,
  },
  recency: { enabled: true, decayDays: 180 },
};

export interface ScoreBreakdown {
  priceScore: number;
  ratingScore: number;
  sentimentScore: number;
  featureScore: number;
  credibilityFactor: number;
  hardConstraintPenalty: number;
  total: number;
}

export interface ScoringResult {
  score: number;
  breakdown: ScoreBreakdown;
  matchingFeatures: string[];
  missingMustHaveFeatures: string[];
  sentimentSummary: ProductReviewAnalysis['sentimentDistribution'] & {
    spamRatio: number;
    confidence: number;
  };
}

export class ProductScorer {
  private reviewAnalyzer: ReviewAnalyzer;
  private config: ScorerConfig;

  constructor(config: Partial<ScorerConfig> = {}) {
    this.reviewAnalyzer = ReviewAnalyzer.getInstance();
    this.config = ProductScorer.buildConfig(config);
  }

  /** Merge defaults, constructor overrides, and environment variables */
  private static buildConfig(overrides: Partial<ScorerConfig>): ScorerConfig {
    // Environment can supply a JSON string to override weights, e.g.:
    // WEIGHTS='{"price":0.15,"sentiment":0.35}'
    const envWeights = process.env.WEIGHTS ? JSON.parse(process.env.WEIGHTS) : {};

    // Deep merge: start with defaults, then overrides by section
    return {
      weights: {
        ...DEFAULT_CONFIG.weights,
        ...overrides.weights,
        ...envWeights,
      },
      price: { ...DEFAULT_CONFIG.price, ...overrides.price },
      rating: { ...DEFAULT_CONFIG.rating, ...overrides.rating },
      sentiment: { ...DEFAULT_CONFIG.sentiment, ...overrides.sentiment },
      feature: { ...DEFAULT_CONFIG.feature, ...overrides.feature },
      credibility: { ...DEFAULT_CONFIG.credibility, ...overrides.credibility },
      hardConstraints: {
        ...DEFAULT_CONFIG.hardConstraints,
        ...overrides.hardConstraints,
      },
      recency: { ...DEFAULT_CONFIG.recency, ...overrides.recency },
    };
  }

  async scoreProduct(product: Product, constraints: UserConstraints): Promise<ScoringResult> {
    const { penaltyMultiplier, missingMustHave } = this.checkHardConstraints(product, constraints);
    const reviewAnalysis = await this.reviewAnalyzer.analyzeProductReviews(product.reviews, product.productId);

    const priceScore = this.computePriceScore(product.price.amount, constraints);
    const ratingScore = this.computeRatingScore(product.rating, reviewAnalysis);
    const sentimentScore = this.computeSentimentScore(reviewAnalysis, product.reviews);
    const { featureScore, matchingFeatures } = this.computeFeatureScore(product, constraints);

    const credibilityFactor = this.computeCredibilityFactor(reviewAnalysis, product.rating);

    const adjustedWeights = this.adjustWeights(constraints);

    const baseScore =
      priceScore * adjustedWeights.price +
      ratingScore * adjustedWeights.rating +
      sentimentScore * adjustedWeights.sentiment +
      featureScore * adjustedWeights.feature;

    const finalScore = Math.max(0, baseScore * credibilityFactor * penaltyMultiplier);

    const validReviews = reviewAnalysis.reviews.filter(r => !r.isSpam);
    const avgConfidence = validReviews.length > 0
      ? validReviews.reduce((sum, r) => sum + r.confidence, 0) / validReviews.length
      : 0;

    return {
      score: finalScore,
      breakdown: {
        priceScore,
        ratingScore,
        sentimentScore,
        featureScore,
        credibilityFactor,
        hardConstraintPenalty: penaltyMultiplier,
        total: finalScore,
      },
      matchingFeatures,
      missingMustHaveFeatures: missingMustHave,
      sentimentSummary: {
        ...reviewAnalysis.sentimentDistribution,
        spamRatio: reviewAnalysis.spamRatio,
        confidence: avgConfidence,
      },
    };
  }

  private checkHardConstraints(
    product: Product,
    constraints: UserConstraints
  ): { penaltyMultiplier: number; missingMustHave: string[] } {
    let penalty = 1.0;
    const missingMustHave: string[] = [];
    const searchText = this.buildProductSearchText(product);

    // Must‑have features
    const mustHaves = constraints.desiredFeatures.filter(f => f.startsWith('must:'));
    for (const must of mustHaves) {
      const cleanMust = must.replace(/^must:/i, '').trim();
      if (!this.fuzzyMatch(cleanMust, searchText, 0.85)) {
        missingMustHave.push(cleanMust);
        penalty *= this.config.hardConstraints.mustHaveMissingPenalty;
      }
    }

    // Excluded features → harsh penalty
    if (constraints.excludedFeatures?.length) {
      for (const exclude of constraints.excludedFeatures) {
        if (this.fuzzyMatch(exclude, searchText, 0.7)) {
          penalty *= this.config.hardConstraints.excludedFeaturePenalty;
          break;
        }
      }
    }

    // Brand constraint (soft)
    if (constraints.brands.length > 0) {
      const productBrandLower = product.brand?.toLowerCase() || '';
      const matchesBrand = constraints.brands.some(b => {
        const bl = b.toLowerCase();
        return productBrandLower.includes(bl) || levenshtein(bl, productBrandLower) <= 3;
      });
      if (!matchesBrand) {
        penalty *= this.config.hardConstraints.brandMismatchPenalty;
      }
    }

    return { penaltyMultiplier: penalty, missingMustHave };
  }

  private buildProductSearchText(product: Product): string {
    return [
      product.title,
      product.description || '',
      ...(product.keyFeatures || []),
      ...Object.values(product.specifications || {}),
    ].join(' ').toLowerCase();
  }

  private computePriceScore(price: number, constraints: UserConstraints): number {
    const { minPrice, maxPrice } = constraints;
    if (minPrice === undefined && maxPrice === undefined) return 1.0;

    const min = minPrice ?? 0;
    const max = maxPrice ?? Infinity;

    if (price < min || price > max) return 0.0;

    if (minPrice !== undefined && maxPrice !== undefined) {
      const range = max - min;
      if (range === 0) return 1.0;
      const bias = this.config.price.lowerIsBetterBias;
      const breakpoint = min + range * (1 - bias) * 0.5;
      if (price <= breakpoint) {
        return 1.0 - 0.2 * ((price - min) / (breakpoint - min));
      } else {
        return 0.8 * (1 - (price - breakpoint) / (max - breakpoint));
      }
    }

    if (maxPrice !== undefined) {
      if (this.config.price.maxPriceScoreShape === 'linear') {
        // Linear from 1 at 0 to 0.5 at maxPrice (so affordable products don't vanish)
        return 1.0 - (price / maxPrice) * 0.5;
      }
      return Math.exp(-price / maxPrice);
    }

    // Only min: prefer near min
    const ratio = price / min;
    return ratio >= 1 ? Math.max(0, 1 - (ratio - 1) * 0.5) : 1;
  }

  private computeRatingScore(rating: Product['rating'], analysis: ProductReviewAnalysis): number {
    if (rating.count === 0) return 0.0;
    const C = this.config.rating.bayesianPriorCount;
    const m = this.config.rating.bayesianPriorMean;
    const bayesianAvg = (C * m + rating.count * rating.average) / (C + rating.count);
    const avgNorm = bayesianAvg / 5.0;
    const countLog = Math.log10(rating.count + 1);
    const thresholdLog = Math.log10(100);
    const countFactor = Math.min(1, countLog / thresholdLog);
    const spamTrust = Math.max(0.7, 1 - analysis.spamRatio * 0.5);
    const countWeight = this.config.rating.countImportance;
    const ratingWeight = 1 - countWeight;
    const baseScore = avgNorm * ratingWeight + countFactor * countWeight;
    return Math.min(1, baseScore * spamTrust);
  }

  private computeSentimentScore(analysis: ProductReviewAnalysis, reviews: Product['reviews']): number {
    const validReviews = analysis.reviews.filter(r => !r.isSpam);
    if (validReviews.length === 0) return 0.5;

    let totalWeight = 0;
    let weightedSum = 0;
    for (let i = 0; i < validReviews.length; i++) {
      const reviewAnalysisItem = validReviews[i];
      const originalReview = reviews[i] ?? null;
      let weight = reviewAnalysisItem.confidence;
      if (this.config.recency.enabled && originalReview?.date) {
        const reviewDate = new Date(originalReview.date);
        const ageDays = (Date.now() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
        const halfLife = this.config.recency.decayDays;
        const decay = Math.pow(0.5, ageDays / halfLife);
        weight *= decay;
      }
      weightedSum += reviewAnalysisItem.sentimentScore * weight;
      totalWeight += weight;
    }
    if (totalWeight === 0) return 0.5;
    const avgWeightedSentiment = weightedSum / totalWeight;
    const rawSentiment = (avgWeightedSentiment + 1) / 2;
    const amplified = Math.pow(rawSentiment, this.config.sentiment.amplificationPower);
    return Math.min(1, amplified);
  }

  private computeFeatureScore(product: Product, constraints: UserConstraints): { featureScore: number; matchingFeatures: string[] } {
    const desiredFeatures = constraints.desiredFeatures.filter(f => !f.startsWith('must:'));
    if (desiredFeatures.length === 0) return { featureScore: 1.0, matchingFeatures: [] };

    const searchText = this.buildProductSearchText(product);
    const matchingFeatures: string[] = [];
    let totalMatchScore = 0;

    for (const feature of desiredFeatures) {
      const matchScore = this.fuzzyMatchScore(feature, searchText);
      if (matchScore >= this.config.feature.fuzzyThreshold) {
        matchingFeatures.push(feature);
        const boost = searchText.includes(feature.toLowerCase()) ? this.config.feature.exactMatchBoost : 1.0;
        totalMatchScore += Math.min(1, matchScore * boost);
      }
    }
    const featureScore = totalMatchScore / desiredFeatures.length;
    return { featureScore, matchingFeatures };
  }

  private fuzzyMatch(query: string, text: string, threshold: number): boolean {
    return this.fuzzyMatchScore(query, text) >= threshold;
  }

  private fuzzyMatchScore(query: string, text: string): number {
    const q = query.toLowerCase().trim();
    if (text.includes(q)) return 1.0;
    const tokens = text.split(/\s+/);
    let bestScore = 0;
    for (const token of tokens) {
      const maxLen = Math.max(q.length, token.length);
      const distance = levenshtein(q, token);
      const score = maxLen === 0 ? 1.0 : 1 - distance / maxLen;
      if (score > bestScore) bestScore = score;
    }
    return bestScore;
  }

  private computeCredibilityFactor(analysis: ProductReviewAnalysis, rating: Product['rating']): number {
    let factor = 1.0;
    const spamPenalty = Math.min(this.config.credibility.maxSpamPenalty, analysis.spamRatio * 0.8);
    factor *= 1 - spamPenalty;

    if (rating.count > 5 && analysis.uniqueReviewers < this.config.credibility.minUniqueReviewers) {
      factor *= 0.8;
    }
    if (rating.average > 4.5 && rating.count < 10 && analysis.spamRatio > 0.2) {
      factor *= 0.7;
    }

    // Rating–sentiment alignment (quick recalc without recency)
    const validAnalyses = analysis.reviews.filter(r => !r.isSpam);
    if (validAnalyses.length > 0) {
      const avgSent = validAnalyses.reduce((s, r) => s + r.sentimentScore, 0) / validAnalyses.length;
      const normSent = (avgSent + 1) / 2;             // 0..1
      const normRating = rating.average / 5.0;
      const misalignment = Math.abs(normRating - normSent);
      if (misalignment > 0.3) factor *= 0.85;
    }

    return Math.max(0.3, factor);
  }

  private adjustWeights(constraints: UserConstraints): ScorerConfig['weights'] {
    const weights = { ...this.config.weights };
    if (constraints.minPrice !== undefined || constraints.maxPrice !== undefined) {
      weights.price = Math.min(0.35, weights.price * 1.5);
      this.normalizeWeights(weights, 'price');
    }
    if (constraints.desiredFeatures.length >= 3) {
      weights.feature = Math.min(0.35, weights.feature * 1.3);
      this.normalizeWeights(weights, 'feature');
    }
    return weights;
  }

  private normalizeWeights(weights: ScorerConfig['weights'], boostedKey: keyof ScorerConfig['weights']): void {
    const sum = Object.values(weights).reduce((a, b) => a + b, 0);
    if (sum === 0) return;
    for (const key in weights) {
      weights[key as keyof typeof weights] /= sum;
    }
  }
}