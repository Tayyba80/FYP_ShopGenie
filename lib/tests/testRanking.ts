// tests/rankingEngine.test.ts
// Run with: npx tsx tests/rankingEngine.test.ts

import { RankingEngine } from '../ranking/rankingEngine';
import { ConstraintExtractor } from '../ranking/constraintExtractor';
import { createMockProduct, reviewSets, createMockReview } from './mocks/productGenerator';
import { Product } from '../../types/product';

// Simple test runner
const tests: { name: string; fn: () => Promise<boolean> }[] = [];
function test(name: string, fn: () => Promise<boolean>) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('🚀 Starting Ranking Engine Tests\n');

  // Initialize canonical features (replaces beforeAll)
  ConstraintExtractor.initializeCanonicalFeatures(
    new Set([
      'bluetooth', 'wireless', 'noise cancelling', 'waterproof', 'fast charging',
      '4k', 'smart', 'portable', 'usb-c', 'led', 'stainless steel', 'automatic',
      'rtx 4060', '16gb ram', 'slim fit', 'regular fit', 'skinny fit',
    ])
  );

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const result = await t.fn();
      if (result) {
        console.log(`✅ ${t.name}`);
        passed++;
      } else {
        console.log(`❌ ${t.name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${t.name} (error: ${error})`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// ----------------------------------------------------------------------------
// Test Scenarios
// ----------------------------------------------------------------------------

// 1. Electronics – Wireless Earbuds with Budget
test('Wireless earbuds: ranks Anker highest, penalizes spammy cheap product', async () => {
  const engine = new RankingEngine();
  const query = 'best wireless earbuds under 5000 with noise cancelling and bluetooth';

  const products: Product[] = [
    createMockProduct({
      platform: 'daraz', category: 'Electronics/Audio',
      title: 'Anker Soundcore Life P3 Wireless Earbuds with Noise Cancelling',
      brand: 'Anker', price: 4500, ratingAvg: 4.6, ratingCount: 342,
      keyFeatures: ['Active Noise Cancelling', 'Bluetooth 5.2', 'Wireless Charging'],
      reviews: [...reviewSets.genuinePositive(50), ...reviewSets.genuineMixed(30, 5)],
    }),
    createMockProduct({
      platform: 'temu', category: 'Electronics/Audio',
      title: 'Sony WF-1000XM4 Wireless Earbuds Noise Cancelling',
      brand: 'Sony', price: 5500, ratingAvg: 4.8, ratingCount: 1200,
      keyFeatures: ['Noise Cancelling', 'Bluetooth 5.2'],
      reviews: reviewSets.genuinePositive(200),
    }),
    createMockProduct({
      platform: 'daraz', category: 'Electronics/Audio',
      title: 'Generic Wireless Earbuds TWS Bluetooth Earphones',
      brand: 'Generic', price: 1200, ratingAvg: 4.9, ratingCount: 15,
      keyFeatures: ['Bluetooth', 'Noise Cancelling'],
      reviews: reviewSets.spammyPositive(15),
    }),
  ];

  const ranked = await engine.rankProducts(products, query, { topN: 3 });

  if (ranked.length === 0) return false;
  const top = ranked[0];
  return (
    top.product.brand === 'Anker' &&
    top.score > 0.7 &&
    top.matchingFeatures.includes('wireless') &&
    top.matchingFeatures.includes('noise cancelling')
  );
});

// 2. Fashion – Jeans with Exclusion (no skinny fit)
test('Jeans: disqualifies skinny fit, prefers Levis brand', async () => {
  const engine = new RankingEngine();
  const query = 'blue denim jeans for men under 3000 not skinny fit prefer Levis';

  const products: Product[] = [
    createMockProduct({
      platform: 'daraz', category: 'Fashion/Men/Jeans',
      title: "Levi's 511 Slim Fit Men's Jeans - Blue",
      brand: "Levi's", price: 2800, ratingAvg: 4.5, ratingCount: 234,
      keyFeatures: ['Slim Fit', 'Stretch Denim'],
      reviews: reviewSets.genuinePositive(40),
    }),
    createMockProduct({
      platform: 'temu', category: 'Fashion/Men/Jeans',
      title: 'Men Regular Fit Blue Jeans Stretchable Denim',
      brand: 'Generic', price: 1500, ratingAvg: 4.0, ratingCount: 87,
      keyFeatures: ['Regular Fit'],
      reviews: reviewSets.genuineMixed(15, 5),
    }),
    createMockProduct({
      platform: 'daraz', category: 'Fashion/Men/Jeans',
      title: "Levi's 510 Skinny Fit Jeans - Dark Blue",
      brand: "Levi's", price: 2900, ratingAvg: 4.6, ratingCount: 178,
      keyFeatures: ['Skinny Fit'],
      reviews: reviewSets.genuinePositive(30),
    }),
  ];

  const ranked = await engine.rankProducts(products, query, { filterDisqualified: true });

  const hasSkinny = ranked.some(p => p.product.title.includes('Skinny'));
  if (hasSkinny) return false;

  return ranked.length > 0 && ranked[0].product.brand === "Levi's";
});

// 3. Home Appliances – Blender with mixed English + Roman Urdu reviews
test('Blender: handles English and Roman Urdu reviews correctly', async () => {
  const engine = new RankingEngine();
  const query = 'stainless steel blender under 8000';

  const mixedReviews = [
    createMockReview('Excellent blender, very powerful motor.', 5, 'John', '2024-01-10'),
    createMockReview('Bohot acha product hai. Delivery time per hui.', 5, 'Ali', '2024-01-15'),
    createMockReview('Works fine but jar lid is loose.', 3, 'Sarah', '2024-02-01'),
    createMockReview('Kharab quality. Paisa waste ho gaya.', 1, 'Sara', '2024-02-10'),
    createMockReview('Good value for money, using daily.', 4, 'Mike', '2024-03-01'),
    createMockReview('Theek hai, kaam chala leta hai.', 3, 'Omar', '2024-03-05'),
  ];

  const products: Product[] = [
    createMockProduct({
      platform: 'daraz', category: 'Home/Kitchen/Blenders',
      title: 'Westpoint Stainless Steel Blender WF-9293',
      brand: 'Westpoint', price: 7500, ratingAvg: 4.2, ratingCount: 145,
      keyFeatures: ['Stainless Steel Jar', '1500W Motor'],
      reviews: mixedReviews,
    }),
    createMockProduct({
      platform: 'temu', category: 'Home/Kitchen/Blenders',
      title: 'Plastic Portable Blender USB',
      brand: 'Generic', price: 2500, ratingAvg: 4.5, ratingCount: 32,
      keyFeatures: ['Portable', 'USB', 'Plastic'],
      reviews: reviewSets.spammyPositive(10),
    }),
  ];

  const ranked = await engine.rankProducts(products, query);
  const top = ranked[0];

  return (
    top.product.title.includes('Stainless Steel') &&
    top.sentimentSummary.spamRatio < 0.3 &&
    top.sentimentSummary.positive > 0
  );
});

// 4. Laptop – Must‑have RTX 4060
test('Laptop: disqualifies product without RTX 4060', async () => {
  const engine = new RankingEngine();
  const query = 'gaming laptop must:rtx 4060 under 200000';

  const products: Product[] = [
    createMockProduct({
      platform: 'daraz', category: 'Electronics/Laptops',
      title: 'HP Victus 15 RTX 4060 16GB RAM',
      brand: 'HP', price: 185000, ratingAvg: 4.4, ratingCount: 89,
      keyFeatures: ['RTX 4060', '16GB RAM'],
      reviews: reviewSets.genuinePositive(15),
    }),
    createMockProduct({
      platform: 'temu', category: 'Electronics/Laptops',
      title: 'MSI Katana 15 RTX 3050 16GB RAM',
      brand: 'MSI', price: 165000, ratingAvg: 4.3, ratingCount: 120,
      keyFeatures: ['RTX 3050', '16GB RAM'],
      reviews: reviewSets.genuinePositive(25),
    }),
  ];

  const ranked = await engine.rankProducts(products, query, { filterDisqualified: true });

  return ranked.length === 1 && ranked[0].product.title.includes('RTX 4060');
});

// 5. Price‑only query (smart watch under 10000)
test('Smart watch: filters over‑budget and ranks best within budget', async () => {
  const engine = new RankingEngine();
  const query = 'smart watch under 10000';

  const products: Product[] = [
    createMockProduct({
      platform: 'daraz', category: 'Wearables',
      title: 'Amazfit GTR 3 Smart Watch',
      brand: 'Amazfit', price: 9500, ratingAvg: 4.5, ratingCount: 320,
      keyFeatures: ['AMOLED', 'GPS'],
      reviews: reviewSets.genuinePositive(50),
    }),
    createMockProduct({
      platform: 'temu', category: 'Wearables',
      title: 'Apple Watch SE',
      brand: 'Apple', price: 45000, ratingAvg: 4.8, ratingCount: 5000,
      keyFeatures: ['Retina', 'Fitness'],
      reviews: reviewSets.genuinePositive(1000),
    }),
    createMockProduct({
      platform: 'daraz', category: 'Wearables',
      title: 'Haylou RS4 Plus',
      brand: 'Haylou', price: 6200, ratingAvg: 4.2, ratingCount: 78,
      keyFeatures: ['AMOLED', 'Bluetooth Calling'],
      reviews: reviewSets.genuineMixed(12, 2),
    }),
  ];

  const ranked = await engine.rankProducts(products, query);
  const allUnderBudget = ranked.every(p => p.product.price.amount <= 10000);
  const topIsAmazfit = ranked[0]?.product.brand === 'Amazfit';
  return allUnderBudget && topIsAmazfit;
});

// 6. Spam Detection – penalize suspicious 5.0 rating
test('Spam detection: penalizes product with suspicious perfect rating', async () => {
  const engine = new RankingEngine();
  const query = 'wireless mouse';

  const products: Product[] = [
    createMockProduct({
      platform: 'temu', category: 'Peripherals',
      title: 'Logitech MX Master 3S Wireless Mouse',
      brand: 'Logitech', price: 8500, ratingAvg: 4.8, ratingCount: 2300,
      keyFeatures: ['Wireless', 'Ergonomic'],
      reviews: reviewSets.genuinePositive(500),
    }),
    createMockProduct({
      platform: 'daraz', category: 'Peripherals',
      title: 'Unknown Brand Wireless Mouse',
      brand: 'Unknown', price: 800, ratingAvg: 5.0, ratingCount: 8,
      keyFeatures: ['Wireless'],
      reviews: [
        createMockReview('Nice mouse', 5, 'user1'),
        createMockReview('Good', 5, 'user2'),
        createMockReview('Good', 5, 'user1'), // duplicate
        createMockReview('Works fine', 5, 'user3'),
      ],
    }),
  ];

  const ranked = await engine.rankProducts(products, query);
  const suspicious = ranked.find(r => r.product.brand === 'Unknown');
  const logitechFirst = ranked[0]?.product.brand === 'Logitech';
  return logitechFirst && (suspicious?.breakdown.credibilityFactor ?? 1) < 0.7;
});

// 7. Recent reviews have more weight
test('Recency: newer reviews influence sentiment more', async () => {
  const engine = new RankingEngine();
  const query = 'phone case';

  const oldPositiveReviews = Array.from({ length: 20 }, (_, i) =>
    createMockReview('Great case!', 5, `User${i}`, '2023-01-01')
  );
  const recentNegativeReviews = Array.from({ length: 5 }, (_, i) =>
    createMockReview('Stopped fitting after a week', 1, `RecentUser${i}`, new Date().toISOString())
  );

  const productWithRecentIssues = createMockProduct({
    platform: 'daraz', category: 'Accessories',
    title: 'Trendy Phone Case',
    brand: 'CaseBrand', price: 800, ratingAvg: 4.6, ratingCount: 25,
    keyFeatures: ['Shockproof'],
    reviews: [...oldPositiveReviews, ...recentNegativeReviews],
  });

  const products = [productWithRecentIssues];
  const ranked = await engine.rankProducts(products, query);

  // The recent negative reviews should pull down the sentiment score
  const sentimentScore = ranked[0].breakdown.sentimentScore;
  return sentimentScore < 0.7; // despite many old 5-star reviews
});

// ----------------------------------------------------------------------------
// Run all tests
// ----------------------------------------------------------------------------
runTests();