// lib/explanationmodule/factExtractor.ts
import { RankedProduct, Product } from '../../types/product';
import { config } from './config';
import { deterministicPick, hashString } from './utils';

// Using arrays for tiers; deterministicPick will use productId + fact type
const pricePhrases = {
  excellent: [
    '🔥 Incredible value at {price}{currency}',
    '💰 Best price — {price}{currency}',
    '🎯 Unbeatable {price}{currency}',
    '💎 Amazing deal: {price}{currency}',
  ],
  good: [
    '💰 Great value at {price}{currency}',
    '💵 Excellent price: {price}{currency}',
    '✨ Very competitive at {price}{currency}',
  ],
  decent: [
    '💰 {price}{currency}',
    '💵 Available for {price}{currency}',
    '📦 Costs {price}{currency}',
  ],
};

const ratingPhrases = {
  exceptional: [
    '⭐ Exceptional {rating}/5',
    '🏆 Top-rated: {rating}/5',
    '👑 Elite {rating}⭐ rating',
  ],
  great: [
    '⭐ Outstanding {rating}/5',
    '📊 {rating} stars — well above average',
    '⭐ Highly rated at {rating}/5',
  ],
  good: [
    '⭐ {rating}/5 stars',
    '📊 Rated {rating} stars',
    '⭐ Solid {rating}-star rating',
  ],
};

const sentimentPhrases = {
  excellent: [
    '🗣️ {positive}% of users recommend this',
    '❤️ {positive}% positive feedback',
    '🎉 {positive}% buyer satisfaction',
  ],
  good: [
    '🗣️ {positive}% positive reviews',
    '👍 {positive}% user satisfaction',
    '📢 {positive}% recommend this',
  ],
};

const featurePhrases = {
  excellent: [
    '✨ Perfect match for: {features}',
    '🎯 Great for {features}',
    '⭐ Top pick for {features}',
  ],
  good: [
    '✨ Good for {features}',
    '🎯 Matches {features}',
    '✓ Great {features} performance',
  ],
};

const trustPhrases = {
  excellent: [
    '✅ Verified premium seller',
    '🛡️ Highly trusted store',
    '🔒 Authentic reviews only',
  ],
  good: [
    '✅ Verified seller',
    '🛡️ Trusted store',
    '✓ Authentic feedback',
  ],
};

const overallPhrases = {
  excellent: ['🏆 {score}/10 — exceptional!', '⭐ {score}/10 — top choice'],
  good: ['📊 {score}/10 — strong pick', '✓ {score}/10 — recommended'],
  solid: ['📊 {score}/10 — solid choice', '👍 {score}/10 — good value'],
  decent: ['📊 {score}/10 — decent option', '✓ {score}/10 — consider this'],
};

export class FactExtractor {
  /**
   * Extract facts deterministically using productId as seed.
   */
  extractFacts(rp: RankedProduct): string[] {
    const facts: string[] = [];
    const product = rp.product;
    const breakdown = rp.breakdown;
    const sentiment = rp.sentimentSummary;
    const features = rp.matchingFeatures;
    const seed = product.productId;   // stable identifier

    const priceFact = this.getPriceFact(product, breakdown, seed);
    if (priceFact) facts.push(priceFact);

    const ratingFact = this.getRatingFact(product, breakdown, seed);
    if (ratingFact) facts.push(ratingFact);

    const sentimentFact = this.getSentimentFact(sentiment, seed);
    if (sentimentFact) facts.push(sentimentFact);

    const featureFact = this.getFeatureFact(breakdown, features, seed);
    if (featureFact) facts.push(featureFact);

    const trustFact = this.getTrustFact(product, breakdown, seed);
    if (trustFact) facts.push(trustFact);

    facts.push(this.getOverallFact(rp, seed));

    return facts.slice(0, config.maxBulletPoints);
  }

  private getPriceFact(product: Product, breakdown: RankedProduct['breakdown'], seed: string): string | null {
    const score = breakdown.priceScore;
    if (score < config.priceThreshold) return null;

    const amount = product.price.amount;
    const currency = config.currencySymbols[product.price.currency] || '$';
    let tier: 'excellent' | 'good' | 'decent' = 'decent';
    if (score > 0.9) tier = 'excellent';
    else if (score > 0.8) tier = 'good';

    const formattedAmount = amount.toFixed(2);
    let text = deterministicPick(pricePhrases[tier], seed + 'price')
      .replace('{price}', formattedAmount)
      .replace('{currency}', currency);

    const original = product.price.originalAmount;
    if (original && original > amount && original > 0) {
      const discount = Math.round((1 - amount / original) * 100);
      text += ` (save ${discount}%)`;
    }
    return text;
  }

  private getRatingFact(product: Product, breakdown: RankedProduct['breakdown'], seed: string): string | null {
    const score = breakdown.ratingScore;
    if (score < config.ratingThreshold) return null;

    const avg = product.rating.average;
    const count = product.rating.count;
    let tier: 'exceptional' | 'great' | 'good' = 'good';
    if (score > 0.95) tier = 'exceptional';
    else if (score > 0.85) tier = 'great';

    const formattedRating = avg.toFixed(1);
    let text = deterministicPick(ratingPhrases[tier], seed + 'rating')
      .replace('{rating}', formattedRating);
    if (count > 100) text += ` from ${count.toLocaleString()} reviews`;
    return text;
  }

  private getSentimentFact(sentiment: RankedProduct['sentimentSummary'], seed: string): string | null {
    const confidence = sentiment.confidence;
    const positive = sentiment.positive;
    const score = confidence * (positive / 100);
    if (score < config.sentimentThreshold) return null;

    const tier = positive > 85 ? 'excellent' : 'good';
    return deterministicPick(sentimentPhrases[tier], seed + 'sentiment')
      .replace('{positive}', positive.toString());
  }

  private getFeatureFact(breakdown: RankedProduct['breakdown'], features: string[], seed: string): string | null {
    const score = breakdown.featureScore;
    if (score < config.featureThreshold || features.length === 0) return null;

    let featuresStr = features[0];
    if (features.length === 2) featuresStr = `${features[0]} and ${features[1]}`;
    else if (features.length >= 3) featuresStr = `${features[0]}, ${features[1]}, and ${features[2]}`;

    const tier = score > 0.9 ? 'excellent' : 'good';
    return deterministicPick(featurePhrases[tier], seed + 'feature')
      .replace('{features}', featuresStr);
  }

  private getTrustFact(product: Product, breakdown: RankedProduct['breakdown'], seed: string): string | null {
    const score = breakdown.credibilityFactor;
    if (score < config.trustThreshold) return null;

    if (score < 0.7) return null;  // same as standard badge
    const tier = score > 0.85 ? 'excellent' : 'good';
    return deterministicPick(trustPhrases[tier], seed + 'trust');
  }

  private getOverallFact(rp: RankedProduct, seed: string): string {
    const score = rp.score;
    let tier: keyof typeof overallPhrases = 'decent';
    if (score >= 9) tier = 'excellent';
    else if (score >= 8) tier = 'good';
    else if (score >= 7) tier = 'solid';

    // Format score to one decimal place
    const formattedScore = score.toFixed(1);
    return deterministicPick(overallPhrases[tier], seed + 'overall')
      .replace('{score}', formattedScore);
  }

  toBulletString(facts: string[]): string {
    return facts.map(f => `• ${f}`).join('\n');
  }
}