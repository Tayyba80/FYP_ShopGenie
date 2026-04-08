// lib/ranking/productScorer.ts

import { Product } from '@/types/product';
import { UserConstraints } from './constraintExtractor';
import { ReviewAnalyzer, ProductReviewAnalysis } from './reviewAnalyzer';

interface ScoreBreakdown {
  priceScore: number;
  ratingScore: number;
  sentimentScore: number;
  featureScore: number;
  authenticityPenalty: number;
  total: number;
}

export class ProductScorer {
  private reviewAnalyzer: ReviewAnalyzer;

  constructor() {
    this.reviewAnalyzer = new ReviewAnalyzer();
  }

  scoreProduct(product: Product, constraints: UserConstraints): {
    score: number;
    breakdown: ScoreBreakdown;
    matchingFeatures: string[];
    sentimentSummary: ProductReviewAnalysis['sentimentDistribution'] & { spamRatio: number };
  } {
    const reviewAnalysis = this.reviewAnalyzer.analyzeProductReviews(product.reviews);

    // 1. Price Score (0-1)
    const priceScore = this.computePriceScore(product.price.amount, constraints);

    // 2. Rating Score (0-1) adjusted by review count
    const ratingScore = this.computeRatingScore(product.rating, reviewAnalysis.spamRatio);

    // 3. Sentiment Score (0-1)
    const sentimentScore = this.computeSentimentScore(reviewAnalysis);

    // 4. Feature Match Score (0-1)
    const { featureScore, matchingFeatures } = this.computeFeatureScore(product, constraints.desiredFeatures);

    // 5. Authenticity Penalty (0-1 multiplier)
    const authenticityPenalty = this.computeAuthenticityPenalty(reviewAnalysis, product.rating);

    // Weighted total (weights can be tuned)
    const weights = {
      price: 0.2,
      rating: 0.2,
      sentiment: 0.35,
      feature: 0.25,
    };

    const baseScore = 
      priceScore * weights.price +
      ratingScore * weights.rating +
      sentimentScore * weights.sentiment +
      featureScore * weights.feature;

    const finalScore = baseScore * (1 - authenticityPenalty);

    return {
      score: finalScore,
      breakdown: {
        priceScore,
        ratingScore,
        sentimentScore,
        featureScore,
        authenticityPenalty,
        total: finalScore,
      },
      matchingFeatures,
      sentimentSummary: {
        ...reviewAnalysis.sentimentDistribution,
        spamRatio: reviewAnalysis.spamRatio,
      },
    };
  }

  private computePriceScore(price: number, constraints: UserConstraints): number {
    if (constraints.minPrice === undefined && constraints.maxPrice === undefined) {
      return 1.0; // No constraint → perfect score
    }

    const min = constraints.minPrice ?? 0;
    const max = constraints.maxPrice ?? Infinity;

    if (price < min) return 0.0;
    if (price > max) return 0.0;

    // Prefer price near the middle of range
    const rangeMiddle = (min + max) / 2;
    const distance = Math.abs(price - rangeMiddle);
    const maxDistance = (max - min) / 2;
    return maxDistance > 0 ? 1 - (distance / maxDistance) : 1.0;
  }

  private computeRatingScore(rating: Product['rating'], spamRatio: number): number {
    if (rating.count === 0) return 0.0;
    
    // Adjust rating based on spam ratio (reduce trust if spammy)
    const trustFactor = Math.max(0, 1 - spamRatio);
    const normalizedRating = rating.average / 5.0;
    
    // Log scale for review count (more reviews → more confidence)
    const countFactor = Math.min(1, Math.log10(rating.count + 1) / Math.log10(100));
    
    return normalizedRating * trustFactor * countFactor;
  }

  private computeSentimentScore(analysis: ProductReviewAnalysis): number {
    const totalValid = analysis.sentimentDistribution.positive + 
                       analysis.sentimentDistribution.negative + 
                       analysis.sentimentDistribution.neutral;
    
    if (totalValid === 0) return 0.5; // Neutral if no valid reviews
    
    const positiveRatio = analysis.sentimentDistribution.positive / totalValid;
    const negativeRatio = analysis.sentimentDistribution.negative / totalValid;
    
    // Score from 0 to 1 based on positive vs negative
    return (positiveRatio + (1 - negativeRatio)) / 2;
  }

  private computeFeatureScore(product: Product, desiredFeatures: string[]): { featureScore: number; matchingFeatures: string[] } {
    if (desiredFeatures.length === 0) return { featureScore: 1.0, matchingFeatures: [] };

    const searchText = [
      product.title,
      product.description,
      ...(product.keyFeatures || []),
      ...Object.values(product.specifications || {}),
    ].join(' ').toLowerCase();

    const matchingFeatures = desiredFeatures.filter(feature => 
      searchText.includes(feature.toLowerCase())
    );

    return {
      featureScore: matchingFeatures.length / desiredFeatures.length,
      matchingFeatures,
    };
  }

  private computeAuthenticityPenalty(analysis: ProductReviewAnalysis, rating: Product['rating']): number {
    let penalty = 0;
    
    // High spam ratio
    if (analysis.spamRatio > 0.3) penalty += 0.3;
    else if (analysis.spamRatio > 0.1) penalty += 0.1;
    
    // Low unique reviewers relative to total reviews
    if (rating.count > 5 && analysis.uniqueReviewers < 3) penalty += 0.2;
    
    // Very high rating with few reviews and many spam flags
    if (rating.average > 4.5 && rating.count < 10 && analysis.spamRatio > 0.2) penalty += 0.2;
    
    return Math.min(penalty, 0.5);
  }
}