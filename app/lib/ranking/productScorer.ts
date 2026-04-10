// lib/ranking/productScorer.ts

import { Product } from '@/types/product';
import { UserConstraints } from './constraintExtractor';
import { ReviewAnalyzer, ProductReviewAnalysis } from './reviewAnalyzer';
import { distance as levenshtein } from 'fastest-levenshtein';

export interface ScorerConfig {
  weights: { price: number; rating: number; sentiment: number; feature: number };
  price: { lowerIsBetterBias: number };
  rating: {
    countImportance: number;
    bayesianPriorCount: number;      // ⭐ new
    bayesianPriorMean: number;       // ⭐ new
  };
  sentiment: {
    amplificationPower: number;       // ⭐ new (e.g., 1.5)
  };
  feature: { fuzzyThreshold: number; exactMatchBoost: number };
  credibility: { maxSpamPenalty: number; minUniqueReviewers: number };
  hardConstraints: { violationPenalty: number };
  recency: {                         // ⭐ new
    enabled: boolean;
    decayDays: number;               // half‑life in days
  };
}

const DEFAULT_CONFIG: ScorerConfig = {
  weights: { price: 0.2, rating: 0.25, sentiment: 0.3, feature: 0.25 },
  price: { lowerIsBetterBias: 0.6 },
  rating: {
    countImportance: 0.3,
    bayesianPriorCount: 10,          // typical number of reviews to start trusting
    bayesianPriorMean: 3.5,          // global average rating assumption
  },
  sentiment: { amplificationPower: 1.5 },
  feature: { fuzzyThreshold: 0.8, exactMatchBoost: 1.2 },
  credibility: { maxSpamPenalty: 0.5, minUniqueReviewers: 3 },
  hardConstraints: { violationPenalty: 0.0 },
  recency: { enabled: true, decayDays: 180 }, // reviews older than 6 months lose influence
};

// ----------------------------------------------------------------------------
// Scoring Output Types
// ----------------------------------------------------------------------------
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

// ----------------------------------------------------------------------------
// Main Scorer Class
// ----------------------------------------------------------------------------
export class ProductScorer {
  private reviewAnalyzer: ReviewAnalyzer;
  private config: ScorerConfig;

  constructor(config: Partial<ScorerConfig> = {}) {
    this.reviewAnalyzer = ReviewAnalyzer.getInstance();
    this.config = this.mergeConfig(config);
  }

  private mergeConfig(overrides: Partial<ScorerConfig>): ScorerConfig {
    return {
      weights: { ...DEFAULT_CONFIG.weights, ...overrides.weights },
      price: { ...DEFAULT_CONFIG.price, ...overrides.price },
      rating: { ...DEFAULT_CONFIG.rating, ...overrides.rating },
      sentiment: { ...DEFAULT_CONFIG.sentiment, ...overrides.sentiment },
      feature: { ...DEFAULT_CONFIG.feature, ...overrides.feature },
      credibility: { ...DEFAULT_CONFIG.credibility, ...overrides.credibility },
      hardConstraints: { ...DEFAULT_CONFIG.hardConstraints, ...overrides.hardConstraints },
      recency: { ...DEFAULT_CONFIG.recency, ...overrides.recency },
    };
  }

  /**
   * Score a single product. Returns detailed breakdown for transparency.
   */
  async scoreProduct(product: Product, constraints: UserConstraints): Promise<ScoringResult> {
    // 1. Hard constraints check
    const { hardConstraintViolation, missingMustHave } = this.checkHardConstraints(product, constraints);

    if (hardConstraintViolation && this.config.hardConstraints.violationPenalty <= 0.0) {
      return this.createDisqualifiedResult(missingMustHave);
    }

    // 2. Analyze reviews using your existing analyzer
    const reviewAnalysis = await this.reviewAnalyzer.analyzeProductReviews(product.reviews);

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

    const penaltyMultiplier = hardConstraintViolation ? 1 - this.config.hardConstraints.violationPenalty : 1.0;
    const finalScore = Math.max(0, baseScore * credibilityFactor * penaltyMultiplier);


    // Compute average confidence of non‑spam reviews
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
        hardConstraintPenalty: hardConstraintViolation ? this.config.hardConstraints.violationPenalty : 0,
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

  // --------------------------------------------------------------------------
  // Hard Constraints (must‑haves, exclusions, brand)
  // --------------------------------------------------------------------------
  private checkHardConstraints(
    product: Product,
    constraints: UserConstraints
  ): { hardConstraintViolation: boolean; missingMustHave: string[] } {
    const missingMustHave: string[] = [];

    // Must-have features – we look for features prefixed with "must:"
    const mustHaves = constraints.desiredFeatures.filter(f => f.startsWith('must:'));
    const searchText = this.buildProductSearchText(product);

    for (const must of mustHaves) {
      const cleanMust = must.replace(/^must:/i, '').trim();
      if (!this.fuzzyMatch(cleanMust, searchText, 0.9)) {
        missingMustHave.push(cleanMust);
      }
    }

    // Excluded features – if any excluded feature is present → violation
    if (constraints.excludedFeatures && constraints.excludedFeatures.length > 0) {
      for (const exclude of constraints.excludedFeatures) {
        if (this.fuzzyMatch(exclude, searchText, 0.7)) {
          return { hardConstraintViolation: true, missingMustHave: [] };
        }
      }
    }

    // Brand preference – if user specified brands, product must match one of them
    if (constraints.brands.length > 0) {
      const productBrandLower = product.brand?.toLowerCase() || '';
      const matchesBrand = constraints.brands.some(b => productBrandLower.includes(b.toLowerCase()));
      if (!matchesBrand) {
        return { hardConstraintViolation: true, missingMustHave: [] };
      }
    }

    return {
      hardConstraintViolation: missingMustHave.length > 0,
      missingMustHave,
    };
  }

  private buildProductSearchText(product: Product): string {
    return [
      product.title,
      product.description || '',
      ...(product.keyFeatures || []),
      ...Object.values(product.specifications || {}),
    ]
      .join(' ')
      .toLowerCase();
  }

  // --------------------------------------------------------------------------
  // Price Scoring
  // --------------------------------------------------------------------------
   private computePriceScore(price: number, constraints: UserConstraints): number {
    const { minPrice, maxPrice } = constraints;

    if (minPrice === undefined && maxPrice === undefined) return 1.0;

    const min = minPrice ?? 0;
    const max = maxPrice ?? Infinity;

    if (price < min || price > max) return 0.0;

    // Both bounds – piecewise linear with steeper slope near min
    if (minPrice !== undefined && maxPrice !== undefined) {
      const range = max - min;
      if (range === 0) return 1.0;

      // Breakpoint at lower third (adjustable via bias)
      const bias = this.config.price.lowerIsBetterBias;
      const breakpoint = min + range * (1 - bias) * 0.5; // ~20% from min when bias=0.6

      if (price <= breakpoint) {
        // Linear from 1.0 at min to 0.8 at breakpoint (configurable)
        return 1.0 - 0.2 * ((price - min) / (breakpoint - min));
      } else {
        // Linear from 0.8 at breakpoint to 0.0 at max
        return 0.8 * (1 - (price - breakpoint) / (max - breakpoint));
      }
    }

    // Only max – exponential decay (fine as is)
    if (maxPrice !== undefined) {
      return Math.exp(-price / maxPrice);
    }

    // Only min – prefer near min
    const ratio = price / min;
    return ratio >= 1 ? 1 / ratio : ratio;
  }

  // --------------------------------------------------------------------------
  // Rating Scoring (using review analysis)
  // --------------------------------------------------------------------------
  private computeRatingScore(rating: Product['rating'], analysis: ProductReviewAnalysis): number {
    if (rating.count === 0) return 0.0;

    // Bayesian average: (C * m + n * x) / (C + n)
    const C = this.config.rating.bayesianPriorCount;
    const m = this.config.rating.bayesianPriorMean;
    const bayesianAvg = (C * m + rating.count * rating.average) / (C + rating.count);
    const avgNorm = bayesianAvg / 5.0;

    // Review count confidence (logarithmic)
    const countLog = Math.log10(rating.count + 1);
    const thresholdLog = Math.log10(100);
    const countFactor = Math.min(1, countLog / thresholdLog);

    // Spam impact
    const spamTrust = Math.max(0.7, 1 - analysis.spamRatio * 0.5);

    const countWeight = this.config.rating.countImportance;
    const ratingWeight = 1 - countWeight;

    const baseScore = avgNorm * ratingWeight + countFactor * countWeight;
    const finalScore = baseScore * spamTrust;

    return Math.min(1, finalScore);
  }

  // --------------------------------------------------------------------------
  // Sentiment Scoring (from review analyzer)
  // --------------------------------------------------------------------------
  private computeSentimentScore(analysis: ProductReviewAnalysis, reviews: Product['reviews']): number {
    const validReviews = analysis.reviews.filter(r => !r.isSpam);
    if (validReviews.length === 0) return 0.5;

    let totalWeight = 0;
    let weightedSum = 0;

    for (let i = 0; i < validReviews.length; i++) {
      const reviewAnalysisItem = validReviews[i];
      const originalReview = reviews[i] ?? null; // assume same order (your analyzer preserves it)

      // Base weight = confidence
      let weight = reviewAnalysisItem.confidence;

      // Recency decay (if enabled and date available)
      if (this.config.recency.enabled && originalReview.date) {
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

    // Map [-1,1] → [0,1] then apply power amplification
    const rawSentiment = (avgWeightedSentiment + 1) / 2;
    const amplified = Math.pow(rawSentiment, this.config.sentiment.amplificationPower);
    return Math.min(1, amplified);
  }


  // --------------------------------------------------------------------------
  // Feature Matching (fuzzy, respects exclusions)
  // --------------------------------------------------------------------------
  private computeFeatureScore(
    product: Product,
    constraints: UserConstraints
  ): { featureScore: number; matchingFeatures: string[] } {
    // Only consider non‑must‑have features for the score (must‑haves are handled separately)
    const desiredFeatures = constraints.desiredFeatures.filter(f => !f.startsWith('must:'));
    if (desiredFeatures.length === 0) {
      return { featureScore: 1.0, matchingFeatures: [] };
    }

    const searchText = this.buildProductSearchText(product);
    const matchingFeatures: string[] = [];
    let totalMatchScore = 0;

    for (const feature of desiredFeatures) {
      const matchScore = this.fuzzyMatchScore(feature, searchText);
      if (matchScore >= this.config.feature.fuzzyThreshold) {
        matchingFeatures.push(feature);
        // Boost exact substring matches
        const boost = searchText.includes(feature.toLowerCase())
          ? this.config.feature.exactMatchBoost
          : 1.0;
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

    // Token-based best match
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

  // --------------------------------------------------------------------------
  // Credibility Factor (multiplicative)
  // --------------------------------------------------------------------------
    private computeCredibilityFactor(analysis: ProductReviewAnalysis, rating: Product['rating']): number {
    let factor = 1.0;

    // Spam penalty
    const spamPenalty = Math.min(this.config.credibility.maxSpamPenalty, analysis.spamRatio * 0.8);
    factor *= 1 - spamPenalty;

    // Unique reviewers
    if (rating.count > 5 && analysis.uniqueReviewers < this.config.credibility.minUniqueReviewers) {
      factor *= 0.8;
    }

    // Suspicious high rating with few reviews
    if (rating.average > 4.5 && rating.count < 10 && analysis.spamRatio > 0.2) {
      factor *= 0.7;
    }

    // ⭐ Alignment check: if rating is high but sentiment is low (or vice versa), reduce trust
    const sentimentScore = this.computeSentimentScore(analysis, []); // quick recalc without recency
    const ratingNorm = rating.average / 5.0;
    const misalignment = Math.abs(ratingNorm - sentimentScore);
    if (misalignment > 0.3) {
      factor *= 0.85; // 15% penalty for misalignment
    }

    return Math.max(0.3, factor);
  }

  // --------------------------------------------------------------------------
  // Dynamic Weight Adjustment
  // --------------------------------------------------------------------------
  private adjustWeights(constraints: UserConstraints): ScorerConfig['weights'] {
    const weights = { ...this.config.weights };

    // If price constraints exist, increase price weight
    if (constraints.minPrice !== undefined || constraints.maxPrice !== undefined) {
      weights.price = Math.min(0.35, weights.price * 1.5);
      this.normalizeWeights(weights, 'price');
    }

    // If many desired features, increase feature weight
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

  // --------------------------------------------------------------------------
  // Disqualified Result
  // --------------------------------------------------------------------------
  private createDisqualifiedResult(missingMustHave: string[]): ScoringResult {
    return {
      score: 0,
      breakdown: {
        priceScore: 0,
        ratingScore: 0,
        sentimentScore: 0,
        featureScore: 0,
        credibilityFactor: 1,
        hardConstraintPenalty: 1,
        total: 0,
      },
      matchingFeatures: [],
      missingMustHaveFeatures: missingMustHave,
      sentimentSummary: {
        positive: 0,
        negative: 0,
        neutral: 0,
        spamRatio: 0,
        confidence: 0,
      },
    };
  }
}