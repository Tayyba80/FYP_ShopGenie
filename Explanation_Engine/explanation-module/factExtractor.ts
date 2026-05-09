// backend/explanation-module/factExtractor.ts
import { RankedProduct, Product } from './types';
import { config } from './config';

// Phrase templates (random selection for variety)
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

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class FactExtractor {
  extractFacts(rankedProduct: RankedProduct): string[] {
    const facts: string[] = [];
    const product = rankedProduct.product;
    const breakdown = rankedProduct.breakdown;
    const sentiment = rankedProduct.sentimentSummary;
    const features = rankedProduct.matchingFeatures;

    // Price
    const priceFact = this.getPriceFact(product, breakdown);
    if (priceFact) facts.push(priceFact);

    // Rating
    const ratingFact = this.getRatingFact(product, breakdown);
    if (ratingFact) facts.push(ratingFact);

    // Sentiment
    const sentimentFact = this.getSentimentFact(sentiment);
    if (sentimentFact) facts.push(sentimentFact);

    // Features
    const featureFact = this.getFeatureFact(breakdown, features);
    if (featureFact) facts.push(featureFact);

    // Trust
    const trustFact = this.getTrustFact(product, breakdown);
    if (trustFact) facts.push(trustFact);

    // Overall
    facts.push(this.getOverallFact(rankedProduct));

    return facts.slice(0, config.maxBulletPoints);
  }

  private getPriceFact(product: Product, breakdown: RankedProduct['breakdown']): string | null {
    const score = breakdown.priceScore;
    if (score < config.priceThreshold) return null;

    const amount = product.price.amount;
    const currency = config.currencySymbols[product.price.currency] || '$';
    let tier: 'excellent' | 'good' | 'decent' = 'decent';
    if (score > 0.9) tier = 'excellent';
    else if (score > 0.8) tier = 'good';

    let text = randomItem(pricePhrases[tier]).replace('{price}', amount.toString()).replace('{currency}', currency);
    const original = product.price.originalAmount;
    if (original && original > amount) {
      const discount = Math.round((1 - amount / original) * 100);
      text += ` (save ${discount}%)`;
    }
    return text;
  }

  private getRatingFact(product: Product, breakdown: RankedProduct['breakdown']): string | null {
    const score = breakdown.ratingScore;
    if (score < config.ratingThreshold) return null;

    const avg = product.rating.average;
    const count = product.rating.count;
    let tier: 'exceptional' | 'great' | 'good' = 'good';
    if (score > 0.95) tier = 'exceptional';
    else if (score > 0.85) tier = 'great';

    let text = randomItem(ratingPhrases[tier]).replace('{rating}', avg.toString());
    if (count > 100) text += ` from ${count.toLocaleString()} reviews`;
    return text;
  }

  private getSentimentFact(sentiment: RankedProduct['sentimentSummary']): string | null {
    const confidence = sentiment.confidence;
    const positive = sentiment.positive;
    const score = confidence * (positive / 100);
    if (score < config.sentimentThreshold) return null;

    const tier = positive > 85 ? 'excellent' : 'good';
    return randomItem(sentimentPhrases[tier]).replace('{positive}', positive.toString());
  }

  private getFeatureFact(breakdown: RankedProduct['breakdown'], features: string[]): string | null {
    const score = breakdown.featureScore;
    if (score < config.featureThreshold || features.length === 0) return null;

    let featuresStr = features[0];
    if (features.length === 2) featuresStr = `${features[0]} and ${features[1]}`;
    else if (features.length >= 3) featuresStr = `${features[0]}, ${features[1]}, and ${features[2]}`;

    const tier = score > 0.9 ? 'excellent' : 'good';
    return randomItem(featurePhrases[tier]).replace('{features}', featuresStr);
  }

  private getTrustFact(product: Product, breakdown: RankedProduct['breakdown']): string | null {
    const score = breakdown.credibilityFactor;
    if (score < config.trustThreshold) return null;

    const seller = product.seller;
    if (!seller?.isVerified && score < 0.85) return null;

    const tier = score > 0.95 ? 'excellent' : 'good';
    return randomItem(trustPhrases[tier]);
  }

  private getOverallFact(rankedProduct: RankedProduct): string {
    const score = rankedProduct.score;
    let tier: keyof typeof overallPhrases = 'decent';
    if (score >= 9) tier = 'excellent';
    else if (score >= 8) tier = 'good';
    else if (score >= 7) tier = 'solid';

    return randomItem(overallPhrases[tier]).replace('{score}', score.toString());
  }

  toBulletString(facts: string[]): string {
    return facts.map(f => `• ${f}`).join('\n');
  }
}