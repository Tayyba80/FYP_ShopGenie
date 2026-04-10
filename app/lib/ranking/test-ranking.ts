// test-ranking.ts
// Run with: npx ts-node test-ranking.ts

import { RankingEngine } from '@/lib/ranking/rankingEngine';
import { Product } from '@/types/product';

// Dummy product generator
function createDummyProducts(): Product[] {
  const baseProduct = (id: string, platform: string, price: number, ratingAvg: number, ratingCount: number, reviews: any[]): Product => ({
    productId: `${platform}_${id}`,
    platform,
    title: `Headphones Model ${id}`,
    productUrl: `https://${platform}.com/product/${id}`,
    mainImageUrl: 'https://via.placeholder.com/150',
    brand: 'BrandX',
    model: `H-${id}`,
    category: 'Electronics > Headphones',
    description: 'Wireless headphones with noise cancellation',
    keyFeatures: ['Wireless', 'Noise Cancelling', '20h battery'],
    price: { amount: price, currency: 'PKR', originalAmount: price + 500, shippingCost: 0 },
    availability: 'in_stock',
    rating: { average: ratingAvg, count: ratingCount },
    reviews,
    specifications: { batteryLife: '20 hours', bluetooth: '5.0' },
    timestamp: new Date().toISOString(),
  });

  // Good product with many genuine reviews
  const p1 = baseProduct('P1', 'daraz', 2500, 4.7, 150, [
    { reviewerName: 'Ali', text: 'Amazing sound quality and battery life!', rating: 5 },
    { reviewerName: 'Sara', text: 'Very comfortable for long use.', rating: 5 },
    { reviewerName: 'Ahmed', text: 'Good value for money.', rating: 4 },
    { reviewerName: 'Zara', text: 'Bass is deep, love it.', rating: 5 },
    { reviewerName: 'Omar', text: 'Noise cancellation works well.', rating: 4 },
  ]);

  // Good rating but suspicious reviews (possible spam)
  const p2 = baseProduct('P2', 'temu', 2200, 4.9, 30, [
    { reviewerName: 'user1', text: 'Great product!', rating: 5 },
    { reviewerName: 'user1', text: 'Excellent!', rating: 5 },
    { reviewerName: 'user1', text: 'Superb!', rating: 5 },
    { reviewerName: 'user2', text: 'Good', rating: 5 },
    { reviewerName: 'user2', text: 'Nice', rating: 5 },
    { reviewerName: 'user3', text: 'Not as expected, broke after a week', rating: 1 },
  ]);

  // Price out of range
  const p3 = baseProduct('P3', 'daraz', 4500, 4.5, 200, [
    { reviewerName: 'Asif', text: 'Premium feel and sound.', rating: 5 },
    { reviewerName: 'Bilal', text: 'Worth the price.', rating: 5 },
  ]);

  // Low rating, negative sentiment
  const p4 = baseProduct('P4', 'temu', 2800, 2.5, 10, [
    { reviewerName: 'Sana', text: 'Battery dies quickly, poor sound.', rating: 2 },
    { reviewerName: 'Faisal', text: 'Not comfortable.', rating: 3 },
    { reviewerName: 'Nadia', text: 'Stopped working after 3 days.', rating: 1 },
  ]);

  // Good but few reviews
  const p5 = baseProduct('P5', 'daraz', 2700, 5.0, 3, [
    { reviewerName: 'Tariq', text: 'Perfect!', rating: 5 },
    { reviewerName: 'Hina', text: 'Loving it!', rating: 5 },
  ]);

  // Matches features exactly
  const p6 = baseProduct('P6', 'temu', 3000, 4.3, 50, [
    { reviewerName: 'Kamran', text: 'Battery lasts long, sound is clear.', rating: 4 },
    { reviewerName: 'Laila', text: 'Good for calls and music.', rating: 4 },
    { reviewerName: 'Rashid', text: 'Decent but not great.', rating: 3 },
  ]);
  p6.keyFeatures = ['30h battery life', 'Hi-Fi sound quality', 'Deep bass'];

  // Inside budget, decent reviews
  const p7 = baseProduct('P7', 'daraz', 2100, 4.0, 80, [
    { reviewerName: 'Usman', text: 'Works fine, nothing special.', rating: 4 },
    { reviewerName: 'Farah', text: 'Good for the price.', rating: 4 },
  ]);

  return [p1, p2, p3, p4, p5, p6, p7];
}

const userQuery = "I want headphones between 2000 and 3000 rs with good sound quality and battery life";

async function testRanking() {
  const products = createDummyProducts();
  console.log(`Testing ranking with ${products.length} dummy products.`);
  console.log('User query:', userQuery);
  console.log('----------------------------------------');

  const engine = new RankingEngine();
  const ranked = engine.rankProducts(products, userQuery);

  console.log('Top 5 Ranked Products:\n');
  ranked.forEach((rp, index) => {
    console.log(`${index + 1}. ${rp.product.title} (${rp.product.platform})`);
    console.log(`   Score: ${rp.score.toFixed(3)}`);
    console.log(`   Price: Rs ${rp.product.price.amount}`);
    console.log(`   Rating: ${rp.product.rating.average}★ (${rp.product.rating.count} reviews)`);
    console.log(`   Sentiment: +${rp.sentimentSummary.positive}/-${rp.sentimentSummary.negative} (spam ratio: ${(rp.sentimentSummary.spamRatio * 100).toFixed(1)}%)`);
    console.log(`   Matching features: ${rp.matchingFeatures.join(', ') || 'none'}`);
    console.log(`   Reason: ${rp.rankingReason}`);
    console.log(`   Score breakdown: price=${rp.breakdown.priceScore.toFixed(2)}, rating=${rp.breakdown.ratingScore.toFixed(2)}, sentiment=${rp.breakdown.sentimentScore.toFixed(2)}, feature=${rp.breakdown.featureScore.toFixed(2)}, penalty=${rp.breakdown.authenticityPenalty.toFixed(2)}`);
    console.log('');
  });
}

testRanking().catch(console.error);