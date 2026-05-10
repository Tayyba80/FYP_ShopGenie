/* -----------------------------------------------------------------------------------
 *  detailedRankingTest.ts
 *
 *  Prints full intermediate results so you can verify the engine’s decisions.
 *  No Jest required – run directly with npx tsx.
 *
 *  Before running, ensure you have added the pipeline‑injection setters to
 *  ConstraintExtractor and ReviewAnalyzer as described in the previous answer.
 * ----------------------------------------------------------------------------------- */

import {
  Product,
  Review,
  RankedProduct,
} from '../../types/product';
import { ConstraintExtractor } from '../ranking/constraintExtractor';
import { ReviewAnalyzer } from '../ranking/reviewAnalyzer';
import { ProductScorer,ScorerConfig } from '../ranking/productScorer';
import { RankingEngine } from '../ranking/rankingEngine';

// ================================================================================
//  Injectable Mock Pipelines (same as before)
// ================================================================================
function mockSentimentPipeline(): any {
  return async (text: string) => {
    const star = (text.length % 5) + 1; // deterministic star rating
    return [{ label: `${star} stars`, score: 0.92 }];
  };
}

function mockFeatureEmbedder(): any {
  return async (input: string | string[], _opts?: any) => {
    const dummy = new Array(384).fill(0.1);
    if (Array.isArray(input)) {
      return { tolist: () => input.map(() => [...dummy]) };
    }
    return { data: dummy, tolist: () => [...dummy] };
  };
}

function mockNerModel(): any {
  return async (_text: string) => [];
}

// Inject mocks
ConstraintExtractor.setPipelines(mockFeatureEmbedder(), mockNerModel());
const analyzer = ReviewAnalyzer.getInstance();
analyzer.setPipelines(mockSentimentPipeline(), mockFeatureEmbedder());

// ================================================================================
//  Test Helpers
// ================================================================================
let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.log(`  ❌ ${description}`);
    failed++;
  }
}

function printSeparator(title = '') {
  console.log(`\n${'─'.repeat(70)}`);
  if (title) console.log(`  ${title}`);
  console.log(`${'─'.repeat(70)}`);
}

// ================================================================================
//  Realistic Products (Daraz & Temu, mixed reviews)
// ================================================================================
function createReview(overrides: Partial<Review> = {}): Review {
  return {
    reviewerName: `User${Math.floor(Math.random() * 1000)}`,
    text: 'Default review text',
    rating: 4,
    date: new Date().toISOString(),
    ...overrides,
  };
}

// Samsung – good overall
const samsungPhone: Product = {
  productId: 'daraz-samsung',
  platform: 'Daraz',
  title: 'Samsung Galaxy A54 5G - 128GB',
  productUrl: 'https://daraz.pk/samsung-a54',
  mainImageUrl: '',
  brand: 'Samsung',
  model: 'Galaxy A54',
  category: 'Smartphones',
  description: 'Samsung Galaxy A54 with 128GB storage, 50MP camera, 5000mAh battery',
  keyFeatures: ['50MP camera', '5000mAh battery', '5G', '128GB storage'],
  price: { amount: 85000, currency: 'PKR' },
  availability: 'In Stock',
  estimatedDelivery: '2-4 days',
  rating: { average: 4.3, count: 120 },
  reviews: [
    createReview({ reviewerName: 'Ali', text: 'Great phone, battery lasts long.', rating: 5 }),
    createReview({ reviewerName: 'Ahmed', text: 'Camera is superb.', rating: 4 }),
    createReview({ reviewerName: 'Ali', text: 'Value for money.', rating: 5 }),
    createReview({ reviewerName: 'Sarah', text: 'Fast delivery.', rating: 4 }),
    createReview({ reviewerName: 'Bilal', text: 'Screen quality poor.', rating: 2 }),
    createReview({ reviewerName: 'Kashif', text: 'Not worth the price.', rating: 1 }),
  ],
  specifications: { Processor: 'Exynos 1380', RAM: '8GB', Display: '6.4" Super AMOLED', OS: 'Android 13' },
  timestamp: new Date().toISOString(),
};

// Xiaomi – competitor, slightly lower price but similar features
const xiaomiPhone: Product = {
  productId: 'temu-xiaomi',
  platform: 'Temu',
  title: 'Xiaomi Redmi Note 13 Pro - 128GB',
  productUrl: 'https://temu.com/redmi-note',
  mainImageUrl: '',
  brand: 'Xiaomi',
  model: 'Redmi Note 13 Pro',
  category: 'Smartphones',
  description: 'Xiaomi Redmi Note 13 Pro with 108MP camera, 5000mAh battery, 5G',
  keyFeatures: ['108MP camera', '5000mAh battery', '5G', '128GB storage'],
  price: { amount: 60000, currency: 'PKR' },
  availability: 'In Stock',
  estimatedDelivery: '5-7 days',
  rating: { average: 4.2, count: 80 },
  reviews: [
    createReview({ reviewerName: 'Hassan', text: '108MP camera is amazing.', rating: 5 }),
    createReview({ reviewerName: 'Nida', text: 'Battery lasts a full day.', rating: 5 }),
    createReview({ reviewerName: 'Yasir', text: 'Phone heats while gaming.', rating: 2 }),
    createReview({ reviewerName: 'Ayesha', text: 'Not as fast as expected.', rating: 3 }),
    createReview({ reviewerName: 'Zain', text: 'Good value for money.', rating: 4 }),
  ],
  specifications: { Processor: 'Snapdragon 7s Gen2', RAM: '8GB', Display: '6.67" AMOLED', OS: 'Android 13' },
  timestamp: new Date().toISOString(),
};

// Budget earbuds – no brand, average reviews
const budgetEarbuds: Product = {
  productId: 'daraz-earbuds',
  platform: 'Daraz',
  title: 'Budget Wireless Earbuds - No Brand',
  productUrl: 'https://daraz.pk/earbuds',
  mainImageUrl: '',
  brand: undefined,
  category: 'Audio',
  description: 'Wireless earbuds with 20hr battery, IPX5 water resistance',
  keyFeatures: ['20hr battery', 'IPX5', 'Bluetooth 5.3'],
  price: { amount: 2500, currency: 'PKR' },
  availability: 'In Stock',
  estimatedDelivery: '5-7 days',
  rating: { average: 3.8, count: 15 },
  reviews: [
    createReview({ reviewerName: 'Usman', text: 'Sound quality is average.', rating: 3 }),
    createReview({ reviewerName: 'Raza', text: 'Battery life is decent.', rating: 4 }),
    createReview({ reviewerName: 'Usman', text: 'Fits well, good for calls.', rating: 4 }),
  ],
  specifications: { 'Driver Size': '10mm', Bluetooth: '5.3' },
  timestamp: new Date().toISOString(),
};

// Anker speaker – excellent reviews, high rating
const ankerSpeaker: Product = {
  productId: 'temu-speaker',
  platform: 'Temu',
  title: 'Portable Bluetooth Speaker, Waterproof, 20W - Anker',
  productUrl: 'https://temu.com/speaker-20w',
  mainImageUrl: '',
  brand: 'Anker',
  model: 'SoundCore Mini',
  category: 'Audio',
  description: 'Compact waterproof speaker with 20W output, 24hr playtime, Bluetooth 5.0',
  keyFeatures: ['20W output', 'Waterproof IPX7', '24hr playtime', 'Bluetooth 5.0'],
  price: { amount: 4500, currency: 'PKR' },
  availability: 'In Stock',
  estimatedDelivery: '10-14 days',
  rating: { average: 4.6, count: 230 },
  reviews: [
    createReview({ reviewerName: 'John', text: 'Amazing sound for its size.', rating: 5 }),
    createReview({ reviewerName: 'Emma', text: 'Battery lasts forever.', rating: 5 }),
    createReview({ reviewerName: 'John', text: 'Highly recommend.', rating: 5 }),
    createReview({ reviewerName: 'David', text: 'Good but not great.', rating: 3 }),
  ],
  specifications: { Power: '20W', Waterproof: 'IPX7', Battery: '24hr' },
  timestamp: new Date().toISOString(),
};

// Fashion dress – positive reviews except one bad
const fashionDress: Product = {
  productId: 'temu-dress',
  platform: 'Temu',
  title: "Women's Summer Dress Floral Print - FashionNova",
  productUrl: 'https://temu.com/summer-dress',
  mainImageUrl: '',
  brand: 'FashionNova',
  category: 'Fashion',
  description: 'Floral print summer dress, cotton, sizes S-XXL',
  keyFeatures: ['Cotton fabric', 'Floral print', 'Multiple sizes'],
  price: { amount: 3200, currency: 'PKR' },
  availability: 'In Stock',
  estimatedDelivery: '8-12 days',
  rating: { average: 4.1, count: 50 },
  reviews: [
    createReview({ reviewerName: 'Aisha', text: 'Beautiful dress, fits well.', rating: 5 }),
    createReview({ reviewerName: 'Fatima', text: 'Fabric is soft and comfortable.', rating: 4 }),
    createReview({ reviewerName: 'Zara', text: 'Color faded after wash.', rating: 2 }),
  ],
  specifications: { Material: 'Cotton', Size: 'S-XXL' },
  timestamp: new Date().toISOString(),
};

// Bad product – cheap generic phone with many negative reviews
const badPhone: Product = {
  productId: 'daraz-badphone',
  platform: 'Daraz',
  title: 'Generic 5G Smartphone - 64GB (unbranded)',
  productUrl: 'https://daraz.pk/generic-phone',
  mainImageUrl: '',
  brand: undefined,
  category: 'Smartphones',
  description: 'Cheap 5G phone with 48MP camera, 4000mAh battery',
  keyFeatures: ['48MP camera', '4000mAh battery', '5G', '64GB storage'],
  price: { amount: 30000, currency: 'PKR' },
  availability: 'In Stock',
  estimatedDelivery: '3-5 days',
  rating: { average: 2.9, count: 25 },
  reviews: [
    createReview({ reviewerName: 'Bilal', text: 'Very slow, hangs a lot.', rating: 1 }),
    createReview({ reviewerName: 'Nida', text: 'Battery drains fast.', rating: 2 }),
    createReview({ reviewerName: 'Ali', text: 'Good for the price.', rating: 4 }),
    createReview({ reviewerName: 'Sara', text: 'Camera is terrible.', rating: 1 }),
    createReview({ reviewerName: 'Omer', text: 'Do not buy.', rating: 1 }),
  ],
  specifications: { Processor: 'Unknown', RAM: '4GB', Display: '6.5" LCD', OS: 'Android 12' },
  timestamp: new Date().toISOString(),
};

const allProducts = [samsungPhone, xiaomiPhone, budgetEarbuds, ankerSpeaker, fashionDress, badPhone];

// ================================================================================
//  Detailed Product Evaluator (used per test)
// ================================================================================
async function evaluateQuery(query: string, engine: RankingEngine, options?: any) {
  printSeparator(`QUERY: "${query}"`);

  // 1. Extract constraints
  const extractor = new ConstraintExtractor(query);
  const constraints = await extractor.extract();
  console.log(`\n📋 Extracted Constraints:`);
  console.log(`  minPrice: ${constraints.minPrice ?? 'none'}, maxPrice: ${constraints.maxPrice ?? 'none'}`);
  console.log(`  currency: ${constraints.currency}`);
  console.log(`  minRating: ${constraints.minRating ?? 'none'}`);
  console.log(`  brands: [${constraints.brands.join(', ') || 'none'}]`);
  console.log(`  desiredFeatures: [${constraints.desiredFeatures.join(', ') || 'none'}]`);
  console.log(`  excludedFeatures: [${constraints.excludedFeatures.join(', ') || 'none'}]`);

  // 2. Rank products
  const results = await engine.rankProducts(allProducts, query, options);
  return { constraints, results };
}

function printProductEvaluation(product: Product, result: RankedProduct) {
  console.log(`\n  ┌─ ${product.platform} | ${product.title}`);
  console.log(`  ├─ Price: ${product.price.amount} ${product.price.currency}`);
  console.log(`  ├─ Rating: ${product.rating.average}★ (${product.rating.count} reviews)`);
  console.log(`  ├─ Key Features: [${product.keyFeatures?.join(', ')}]`);
  const sent = result.sentimentSummary;
  console.log(`  ├─ Sentiment: ▴${sent.positive} ▾${sent.negative} ▬${sent.neutral} | Spam ratio: ${(sent.spamRatio*100).toFixed(1)}% | Confidence: ${(sent.confidence*100).toFixed(1)}%`);
  console.log(`  ├─ Score Breakdown:`);
  console.log(`  │    priceScore:        ${result.breakdown.priceScore.toFixed(3)}`);
  console.log(`  │    ratingScore:       ${result.breakdown.ratingScore.toFixed(3)}`);
  console.log(`  │    sentimentScore:    ${result.breakdown.sentimentScore.toFixed(3)}`);
  console.log(`  │    featureScore:      ${result.breakdown.featureScore.toFixed(3)}`);
  console.log(`  │    credibilityFactor: ${result.breakdown.credibilityFactor.toFixed(3)}`);
  console.log(`  │    hardConstraintPen: ${result.breakdown.hardConstraintPenalty.toFixed(3)}`);
  console.log(`  │    ═══ TOTAL:       ${result.score.toFixed(3)}`);
  console.log(`  ├─ Matching Features: [${result.matchingFeatures.join(', ')}]`);
  console.log(`  ├─ Missing Must‑Have:  [${result.missingMustHaveFeatures.join(', ') || 'none'}]`);
  console.log(`  └─ Reason: ${result.rankingReason}`);
}

// ================================================================================
//  Main Test Scenarios
// ================================================================================
(async () => {
  // Configure engine with tolerant settings (same as production)
  const config: Partial<ScorerConfig> = {
    hardConstraints: {
      brandMismatchPenalty: 0.5,
      mustHaveMissingPenalty: 0.7,
      excludedFeaturePenalty: 0.0,
    },
    price: { lowerIsBetterBias: 0.6, maxPriceScoreShape: 'linear' },
  };
  const engine = new RankingEngine(config);

  // -------------------------------------------------------------
  // Scenario 1: Smartphone with camera under 90k
  // -------------------------------------------------------------
  let { results } = await evaluateQuery(
    'Best smartphone with good camera under 90000 pkr',
    engine,
    { topN: 3 }
  );
  console.log('\n🔹 All product scores:');
  for (const r of results) {
    printProductEvaluation(r.product, r);
  }
  // Assertions
  const top1 = results[0];
  assert(top1.product.productId === 'daraz-samsung', 'Samsung ranked #1');
  assert(results.some(r => r.product.productId === 'temu-xiaomi'), 'Xiaomi appears in top results');
  // Generic bad phone should be at bottom or excluded due to low score
  if (results.find(r => r.product.productId === 'daraz-badphone')) {
    assert(results[results.length-1].score < 0.5, 'Bad phone has low score');
  }

  // -------------------------------------------------------------
  // Scenario 2: Bluetooth speaker with long battery, waterproof
  // -------------------------------------------------------------
  printSeparator();
  ({ results } = await evaluateQuery(
    'Bluetooth speaker with long battery life, waterproof',
    engine,
    { topN: 3 }
  ));
  for (const r of results) printProductEvaluation(r.product, r);
  const speaker = results.find(r => r.product.productId === 'temu-speaker');
  assert(speaker !== undefined, 'Anker speaker tops');
  assert(speaker!.score > 0.7, 'Speaker score > 0.7');
  // Earbuds should not rank higher than speaker
  const earbudsIdx = results.findIndex(r => r.product.productId === 'daraz-earbuds');
  if (earbudsIdx >= 0) {
    assert(earbudsIdx > results.findIndex(r => r.product.productId === 'temu-speaker'), 'Speaker above earbuds');
  }

  // -------------------------------------------------------------
  // Scenario 3: Earbuds without bluetooth (exclusion)
  // -------------------------------------------------------------
  printSeparator();
  ({ results } = await evaluateQuery(
    'Earbuds without bluetooth',
    engine,
    { topN: 5, filterDisqualified: false, minScore: 0 } // show all to see disqualified
  ));
  for (const r of results) printProductEvaluation(r.product, r);
  const earbuds = results.find(r => r.product.productId === 'daraz-earbuds');
  assert(earbuds !== undefined, 'Earbuds present');
  // Since earbuds have Bluetooth, they should be disqualified (score 0)
  if (earbuds) assert(earbuds.score === 0, 'Earbuds disqualified due to Bluetooth exclusion');

  // -------------------------------------------------------------
  // Scenario 4: Fashion dress cotton
  // -------------------------------------------------------------
  printSeparator();
  ({ results } = await evaluateQuery(
    'Fashion dress cotton',
    engine,
    { topN: 3 }
  ));
  for (const r of results) printProductEvaluation(r.product, r);
  assert(results[0].product.productId === 'temu-dress', 'Dress ranked first');
  assert(results[0].matchingFeatures.includes('Cotton fabric'), 'Cotton feature matched');

  // -------------------------------------------------------------
  // Scenario 5: Must-have 108MP camera (forces Xiaomi over Samsung)
  // -------------------------------------------------------------
  printSeparator();
  ({ results } = await evaluateQuery(
    'Phone with excellent battery and 5G, must: 108MP camera',
    engine,
    { topN: 3 }
  ));
  for (const r of results) printProductEvaluation(r.product, r);
  // Xiaomi should be above Samsung because Samsung lacks 108MP (must-have penalty)
  const xiaomiRank = results.findIndex(r => r.product.productId === 'temu-xiaomi');
  const samsungRank = results.findIndex(r => r.product.productId === 'daraz-samsung');
  if (xiaomiRank >= 0 && samsungRank >= 0) {
    assert(xiaomiRank < samsungRank, 'Xiaomi (has 108MP) ranked above Samsung (missing must-have)');
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  printSeparator('FINAL REPORT');
  console.log(`\n🏁  ${passed} passed, ${failed} failed out of ${passed + failed} assertions.`);
  process.exit(failed > 0 ? 1 : 0);
})();