// lib/ranking/reviewAnalyzer.ts

import { Review } from '@/types/product';
import Sentiment from 'sentiment'; // npm install sentiment

interface ReviewAnalysis {
  sentimentScore: number;        // -5 to +5
  sentimentLabel: 'positive' | 'negative' | 'neutral';
  isSpam: boolean;
  spamReason?: string;
}

export interface ProductReviewAnalysis {
  reviews: ReviewAnalysis[];
  spamRatio: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  averageSentiment: number;
  uniqueReviewers: number;
}

export class ReviewAnalyzer {
  private sentimentAnalyzer: Sentiment;

  constructor() {
    this.sentimentAnalyzer = new Sentiment();
  }

  analyzeProductReviews(reviews: Review[]): ProductReviewAnalysis {
    const analyzedReviews: ReviewAnalysis[] = reviews.map(r => this.analyzeSingleReview(r, reviews));
    
    const spamCount = analyzedReviews.filter(r => r.isSpam).length;
    const spamRatio = reviews.length > 0 ? spamCount / reviews.length : 0;
    
    const distribution = {
      positive: analyzedReviews.filter(r => r.sentimentLabel === 'positive' && !r.isSpam).length,
      negative: analyzedReviews.filter(r => r.sentimentLabel === 'negative' && !r.isSpam).length,
      neutral: analyzedReviews.filter(r => r.sentimentLabel === 'neutral' && !r.isSpam).length,
    };

    const validReviews = analyzedReviews.filter(r => !r.isSpam);
    const averageSentiment = validReviews.length > 0
      ? validReviews.reduce((sum, r) => sum + r.sentimentScore, 0) / validReviews.length
      : 0;

    const uniqueReviewers = new Set(reviews.map(r => r.reviewerName?.toLowerCase().trim()).filter(Boolean)).size;

    return {
      reviews: analyzedReviews,
      spamRatio,
      sentimentDistribution: distribution,
      averageSentiment,
      uniqueReviewers,
    };
  }

  private analyzeSingleReview(review: Review, allReviews: Review[]): ReviewAnalysis {
    const sentimentResult = this.sentimentAnalyzer.analyze(review.text);
    const score = sentimentResult.score;
    
    let label: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (score > 0) label = 'positive';
    else if (score < 0) label = 'negative';

    // Spam detection heuristics
    let isSpam = false;
    let spamReason = '';

    // 1. Rating-sentiment mismatch (strong negative text but 5 stars)
    if (review.rating >= 4 && score < -2) {
      isSpam = true;
      spamReason = 'Rating-sentiment mismatch (high rating, negative text)';
    }

    // 2. Very short generic review
    if (review.text.length < 10 && /^(good|nice|great|ok|bad|poor)$/i.test(review.text.trim())) {
      isSpam = true;
      spamReason = 'Too short and generic';
    }

    // 3. Duplicate reviewer names with similar text
    const sameReviewerReviews = allReviews.filter(r => 
      r.reviewerName?.toLowerCase().trim() === review.reviewerName?.toLowerCase().trim()
    );
    if (sameReviewerReviews.length > 2) {
      const similarCount = sameReviewerReviews.filter(r => 
        this.textSimilarity(r.text, review.text) > 0.8
      ).length;
      if (similarCount > 1) {
        isSpam = true;
        spamReason = 'Multiple similar reviews from same reviewer';
      }
    }

    // 4. Review text identical to another
    const identicalCount = allReviews.filter(r => r.text === review.text).length;
    if (identicalCount > 1) {
      isSpam = true;
      spamReason = 'Identical review text appears multiple times';
    }

    return { sentimentScore: score, sentimentLabel: label, isSpam, spamReason };
  }

  private textSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity on words
    const words1 = new Set(text1.toLowerCase().split(/\W+/));
    const words2 = new Set(text2.toLowerCase().split(/\W+/));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }
}