// backend/explanation-module/tests/testExplanationModule.ts
import { ShopGenieExplanationModule, RankedProduct } from '../index';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../../.env' });

// Helper to create sample products
function createProduct(
  id: string,
  platform: string,
  title: string,
  price: number,
  rating: number,
  reviewCount: number,
  features: string[],
  originalPrice?: number
): RankedProduct {
  const priceScore = Math.min(0.95, Math.max(0.5, 1 - (price / 400)));
  const ratingScore = rating / 5;
  const sentimentScore = 0.85 + (rating / 50);
  const featureScore = 0.85;
  const credibilityFactor = 0.92;

  return {
    product: {
      productId: `${platform}_${id}`,
      platform,
      title,
      productUrl: `https://${platform}.com/${id}`,
      mainImageUrl: `https://images.${platform}.com/${id}.jpg`,
      brand: title.split(' ')[0],
      category: 'Electronics > Headphones',
      description: `Premium ${title} with great features.`,
      keyFeatures: features,
      price: {
        amount: price,
        currency: 'USD',
        originalAmount: originalPrice || price,
        shippingCost: 0,
      },
      availability: 'in_stock',
      estimatedDelivery: '2-5 days',
      rating: {
        average: rating,
        count: reviewCount,
      },
      reviews: features.map(f => ({ text: `Great ${f}`, rating: 5 })),
      specifications: { battery: '30h', bluetooth: '5.3' },
      seller: {
        name: `${title.split(' ')[0]} Official`,
        isVerified: true,
        rating: 4.9,
      },
      timestamp: new Date().toISOString(),
    },
    score: 7 + (price / 100),
    breakdown: {
      priceScore,
      ratingScore,
      sentimentScore,
      featureScore,
      credibilityFactor,
      hardConstraintPenalty: 0,
      total: (priceScore + ratingScore + sentimentScore + featureScore + credibilityFactor) / 5,
    },
    matchingFeatures: features.slice(0, 2),
    sentimentSummary: {
      positive: 85 + Math.floor(rating * 5),
      negative: 5,
      neutral: 10,
      spamRatio: 0.02,
      confidence: 0.95,
    },
    rankingReason: `Great ${features[0].toLowerCase()} and value.`,
  };
}

// Create 6 sample products
const sampleProducts: RankedProduct[] = [
  createProduct('sony_xm5', 'daraz', 'Sony WH-1000XM5', 178, 4.9, 12450, ['Noise Cancellation', '30hr Battery', 'Comfort Fit'], 399),
  createProduct('bose_qc45', 'temu', 'Bose QuietComfort 45', 199, 4.8, 8900, ['Acoustic Noise Cancelling', '24hr Battery', 'Lightweight'], 329),
  createProduct('jbl_770', 'daraz', 'JBL Tune 770NC', 129, 4.6, 3450, ['Active Noise Cancelling', '70hr Battery', 'Foldable'], 199),
  createProduct('sony_ch720', 'temu', 'Sony WH-CH720N', 98, 4.5, 5678, ['Noise Cancelling', '50hr Battery', 'Lightweight Design'], 149),
  createProduct('soundcore_q45', 'daraz', 'Soundcore Space Q45', 149, 4.7, 2345, ['Adaptive Noise Cancelling', '65hr Battery', 'LDAC Support'], 199),
  createProduct('anker_q30', 'amazon', 'Anker Soundcore Life Q30', 79, 4.4, 9876, ['Hybrid Noise Cancelling', '40hr Battery', 'Memory Foam'], 129),
];

async function runTest() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 SHOPGENIE EXPLANATION MODULE TEST (TypeScript)');
  console.log('='.repeat(70));

  const module = new ShopGenieExplanationModule();

  console.log(`\n📊 Processing ${sampleProducts.length} products...\n`);
  const result = await module.process('wireless headphones under 200', sampleProducts);

  console.log('\n' + '='.repeat(70));
  console.log('💬 CHAT RESPONSE');
  console.log('='.repeat(70));
  console.log(result.chatResponse);

  console.log('\n' + '='.repeat(70));
  console.log(`🃏 PRODUCT CARDS (${result.productCards.length} products)`);
  console.log('='.repeat(70));

  for (const card of result.productCards) {
    console.log(`\n${'-'.repeat(50)}`);
    console.log(`📦 Rank #${card.rank}: ${card.name}`);
    console.log(`   🏷️  Brand: ${card.brand || 'N/A'}`);
    console.log(`   🌐 Platform: ${card.platform.name} ${card.platform.icon}`);
    console.log(`   🔗 URL: ${card.productUrl}`);
    console.log(`   🖼️  Image: ${card.imageUrl}`);
    console.log(`   💰 Price: ${card.price.display} (${card.price.original ? `was ${card.price.original}` : ''})`);
    console.log(`   ⭐ Rating: ${card.rating.display} (${card.rating.count.toLocaleString()} reviews)`);
    console.log(`\n   🏅 Badges:`);
    for (const badge of card.badges) {
      console.log(`      - ${badge.text}`);
    }
    if (card.trustBadge.show) {
      console.log(`   ✅ Trust: ${card.trustBadge.text}`);
    }
    console.log(`\n   📝 Bullet points:`);
    for (const point of card.explanation.bulletPoints) {
      console.log(`      • ${point}`);
    }
    if (card.explanation.natural) {
      console.log(`\n   🤖 AI Explanation:`);
      console.log(`      "${card.explanation.natural}"`);
    }
    console.log(`\n   🔘 CTA: ${card.cta.text}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📊 STATISTICS');
  console.log('='.repeat(70));
  console.log(`Total Products Processed: ${result.stats.productsProcessed}`);
  console.log(`LLM Success Count: ${result.stats.llmSuccessCount}`);
  console.log(`LLM Success Rate: ${result.stats.llmSuccessRate}`);

  console.log('\n' + '='.repeat(70));
  console.log('💡 SUGGESTED FOLLOW-UPS');
  console.log('='.repeat(70));
  result.suggestedFollowups.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));

  console.log('\n' + '='.repeat(70));
  console.log('✅ TEST COMPLETED');
  console.log('='.repeat(70) + '\n');
}

// Run the test
runTest().catch(console.error);