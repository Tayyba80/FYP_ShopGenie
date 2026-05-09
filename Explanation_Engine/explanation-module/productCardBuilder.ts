// backend/explanation-module/productCardBuilder.ts
import { RankedProduct, ProductCard } from './types';
import { config } from './config';

export class ProductCardBuilder {
  build(rankedProduct: RankedProduct, rank: number, bulletPoints: string[], llmExplanation: string | null): ProductCard {
    const product = rankedProduct.product;
    const breakdown = rankedProduct.breakdown;
    const sentiment = rankedProduct.sentimentSummary;
    const price = product.price;
    const rating = product.rating;
    const seller = product.seller || { name: '', isVerified: false };

    const platformCode = product.platform;
    const platformInfo = config.platformConfig[platformCode] || { name: platformCode.toUpperCase(), icon: '🛍️' };

    const currencySymbol = config.currencySymbols[price.currency] || '$';
    const amount = price.amount;

    const ratingScore = rating.average;
    const fullStars = Math.floor(ratingScore);
    const emptyStars = 5 - fullStars;
    const stars = '★'.repeat(fullStars) + '☆'.repeat(emptyStars);

    // Badges
    const badges: Array<{ text: string; type: string }> = [];
    if (rank === 1) badges.push({ text: '🏆 Best Overall', type: 'gold' });
    else if (rank === 2) badges.push({ text: '🥈 Runner Up', type: 'silver' });
    else if (rank === 3) badges.push({ text: '🥉 Great Choice', type: 'bronze' });
    if (breakdown.priceScore > 0.85) badges.push({ text: '💰 Best Value', type: 'green' });
    if (breakdown.ratingScore > 0.95) badges.push({ text: '⭐ Top Rated', type: 'gold' });
    if (rankedProduct.score >= 9) badges.push({ text: '🏆 Editor\'s Choice', type: 'gold' });
    if (badges.length > 4) badges.length = 4;

    // Trust badge
    let trustBadge = { show: false, text: '', type: '' };
    if (seller.isVerified && breakdown.credibilityFactor > 0.85) {
      trustBadge = { show: true, text: '✓ Verified Premium Seller', type: 'premium' };
    } else if (breakdown.credibilityFactor > 0.7) {
      trustBadge = { show: true, text: '✓ Trusted Seller', type: 'standard' };
    }

    // Short explanation
    let short = '🎯 Solid choice';
    if (breakdown.priceScore > 0.85) short = `💰 Best value at ${currencySymbol}${amount}`;
    else if (breakdown.ratingScore > 0.9) short = `⭐ Top-rated with ${ratingScore} stars`;
    else if (rankedProduct.matchingFeatures.length) short = `✨ Great for ${rankedProduct.matchingFeatures[0]}`;

    return {
      rank,
      productId: product.productId,
      name: product.title,
      brand: product.brand,
      productUrl: product.productUrl,
      imageUrl: product.mainImageUrl,
      platform: {
        name: platformInfo.name,
        code: platformCode,
        icon: platformInfo.icon,
        color: platformInfo.color,
      },
      price: {
        amount,
        display: `${currencySymbol}${amount.toFixed(2)}`,
        original: price.originalAmount,
        currency: price.currency,
        shipping: price.shippingCost,
      },
      rating: {
        score: ratingScore,
        count: rating.count,
        display: `${ratingScore}/5`,
        stars,
        percentage: (ratingScore / 5) * 100,
      },
      seller: {
        name: seller.name,
        isVerified: seller.isVerified,
        rating: seller.rating,
      },
      availability: product.availability,
      delivery: product.estimatedDelivery,
      keyFeatures: product.keyFeatures?.slice(0, 3) || [],
      badges,
      trustBadge,
      scores: {
        overall: rankedProduct.score,
        price: breakdown.priceScore,
        rating: breakdown.ratingScore,
        features: breakdown.featureScore,
        trust: breakdown.credibilityFactor,
      },
      sentiment: {
        positive: sentiment.positive,
        spamRatio: sentiment.spamRatio,
      },
      explanation: {
        bulletPoints,
        short,
        natural: llmExplanation,
        rankingReason: rankedProduct.rankingReason,
        llmUsed: llmExplanation !== null,
      },
      cta: {
        text: `View on ${platformInfo.name} →`,
        url: product.productUrl,
      },
    };
  }
}