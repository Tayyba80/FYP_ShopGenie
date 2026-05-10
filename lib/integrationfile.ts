// lib/integration-test.ts
// Run: npx tsx lib/integration-test.ts
// Ensure .env.local has:
//   DATABASE_URL=your_neon_postgres_url
//   GROQ_API_KEY=your_key (if USE_LLM=true)
//   USE_LLM=true (optional, to test LLM rewriting)

import 'dotenv/config';
import { ConstraintExtractor } from './ranking/constraintExtractor';
import { RankingEngine } from './ranking/rankingEngine';
import { getKnowledgeCache, setKnowledgeDb } from './ranking/knowledgeCache';
import { prisma } from './prisma';                          // adjust path to your Prisma client
import { Product } from '@/types/product';                  // or relative path
import { ShopGenieExplanationModule } from './explanation-module/explanationModule';
import type { RankedProduct } from '@/types/product';

// ------------------------------------------------------------------
// 1. Realistic product batch (same as before)
// ------------------------------------------------------------------
const scrapedProducts: Product[] = [
  {
    productId: 'prod-001',
    platform: 'daraz',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    productUrl: 'https://daraz.pk/sony-wh1000xm5',
    mainImageUrl: 'https://img.daraz.pk/sony-wh1000xm5.jpg',
    brand: 'Sony',
    category: 'Headphones',
    description: 'Industry-leading noise cancellation with premium sound quality. 30-hour battery life.',
    keyFeatures: ['noise cancellation', 'wireless', '30h battery', 'premium sound'],
    price: { amount: 4500, currency: 'PKR' },
    availability: 'In Stock',
    rating: { average: 4.5, count: 120 },
    reviews: [
      { reviewerName: 'Ali', text: 'Best headphones ever! Noise cancelling is amazing.', rating: 5, date: '2025-01-15' },
      { reviewerName: 'Sara', text: 'Great sound but a bit expensive.', rating: 4, date: '2025-02-01' },
      { reviewerName: 'X', text: 'good', rating: 5, date: '2025-03-10' },
    ],
    specifications: {
      'Battery Life': '30 hours',
      Connectivity: 'Bluetooth 5.2',
      Weight: '250g',
    },
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'prod-002',
    platform: 'daraz',
    title: 'Samsung Galaxy Buds2 Pro – Wireless Earbuds',
    productUrl: 'https://daraz.pk/samsung-buds2pro',
    mainImageUrl: 'https://img.daraz.pk/samsung-buds2pro.jpg',
    brand: 'Samsung',
    category: 'Earbuds',
    description: 'Hi‑fi sound with intelligent ANC. Compact and water resistant.',
    keyFeatures: ['active noise cancelling', 'wireless', 'water resistant', 'hi-fi audio'],
    price: { amount: 3200, currency: 'PKR' },
    availability: 'In Stock',
    rating: { average: 4.2, count: 85 },
    reviews: [
      { reviewerName: 'Hassan', text: 'ANC is great, fits well in ears.', rating: 5, date: '2025-04-01' },
    ],
    specifications: {
      'Battery Life': '20 hours',
      Connectivity: 'Bluetooth 5.3',
      'Water Resistance': 'IPX7',
    },
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'prod-003',
    platform: 'daraz',
    title: 'Audio-Technica ATH-M50x Professional Studio Headphones (Wired)',
    productUrl: 'https://daraz.pk/ath-m50x',
    mainImageUrl: 'https://img.daraz.pk/ath-m50x.jpg',
    brand: 'Audio-Technica',
    category: 'Headphones',
    description: 'Wired studio headphones with critically acclaimed clarity and comfort.',
    keyFeatures: ['wired', 'studio sound', 'foldable', 'detachable cable'],
    price: { amount: 5500, currency: 'PKR' },
    availability: 'In Stock',
    rating: { average: 4.7, count: 250 },
    reviews: [
      { reviewerName: 'Zain', text: 'Stunning sound clarity, perfect for mixing.', rating: 5, date: '2025-02-10' },
    ],
    specifications: {
      'Driver Type': '45mm',
      'Frequency Response': '15-28,000 Hz',
      'Weight': '285g',
    },
    timestamp: new Date().toISOString(),
  },
  {
    productId: 'prod-004',
    platform: 'daraz',
    title: 'JBL Tune 510BT Wireless On-Ear Headphones',
    productUrl: 'https://daraz.pk/jbl-510bt',
    mainImageUrl: 'https://img.daraz.pk/jbl-510bt.jpg',
    brand: 'JBL',
    category: 'Headphones',
    description: 'Wireless headphones with deep bass and 40h battery.',
    keyFeatures: ['wireless', 'deep bass', '40h battery'],
    price: { amount: 2200, currency: 'PKR' },
    availability: 'In Stock',
    rating: { average: 4.0, count: 200 },
    reviews: [
      { reviewerName: 'Ayesha', text: 'Bass is heavy, battery lasts forever.', rating: 4, date: '2025-05-01' },
    ],
    specifications: {
      'Battery Life': '40 hours',
      Connectivity: 'Bluetooth 5.0',
    },
    timestamp: new Date().toISOString(),
  },
];

// ------------------------------------------------------------------
// 2. Integration test function
// ------------------------------------------------------------------
async function runIntegrationTest() {
  console.log('🔌 Connecting to Neon PostgreSQL via Prisma...');
  setKnowledgeDb(prisma);

  const cache = getKnowledgeCache();
  console.log('📥 Loading existing knowledge from DB...');
  await cache.loadFromDb();

  console.log(`   Brands: ${cache.getBrands().length}`);
  console.log(`   Features: ${cache.getFeatures().length}\n`);

  console.log('🧠 Learning from scraped products...');
  await cache.learnFromProducts(scrapedProducts);

  console.log(`   Brands after learning: ${cache.getBrands().length}`);
  console.log(`   Features after learning: ${cache.getFeatures().length}\n`);

  // Feed global knowledge into the ConstraintExtractor
  ConstraintExtractor.setKnownBrands(cache.getBrands());
  ConstraintExtractor.initializeCanonicalFeatures(cache.getFeatures());

  // ───── Ranking Phase ─────
  const query = 'Sony headphones with noise cancellation, no wireless, under 5000 pkr';
  console.log(`🧪 User Query: "${query}"\n`);

  const engine = new RankingEngine();
  const ranked: RankedProduct[] = await engine.rankProducts(scrapedProducts, query, { topN: 3 });

  console.log('🏆 RANKED PRODUCTS (to be explained):');
  ranked.forEach((item, idx) => {
    console.log(`${idx + 1}. ${item.product.title}`);
    console.log(`   Score: ${item.score.toFixed(2)} | Reason: ${item.rankingReason}`);
    if (item.missingMustHaveFeatures.length > 0) {
      console.log(`   ❌ Missing Must-Have: ${item.missingMustHaveFeatures.join(', ')}`);
    }
  });
  console.log('\n');

  // ───── Explanation Phase ─────
  console.log('💡 GENERATING EXPLANATIONS...\n');
  const explainer = new ShopGenieExplanationModule();
  const explanationOutput = await explainer.process(query, ranked);

  console.log('════════════════════════════════════════');
  console.log('📊 FINAL EXPLANATION OUTPUT:');
  console.log('Query:', explanationOutput.query);
  console.log('Timestamp:', explanationOutput.timestamp);
  console.log('Total products:', explanationOutput.totalProducts);
  console.log('Total found:', explanationOutput.totalFound);
  console.log('Stats:', explanationOutput.stats);

  console.log('\n💬 Chat Response:');
  console.log(explanationOutput.chatResponse);

  console.log('\n🛍️ Product Cards:');
  explanationOutput.productCards.forEach(card => {
    console.log(`\n--- Rank ${card.rank}: ${card.name} ---`);
    console.log(`   Platform: ${card.platform.name} (${card.platform.code})`);
    console.log(`   Price: ${card.price.display}`);
    console.log(`   Rating: ${card.rating.display} (${card.rating.count} reviews)`);
    console.log(`   Badges: ${card.badges.map(b => b.text).join(' | ') || 'none'}`);
    console.log(`   Scores: overall=${card.scores.overall}, price=${card.scores.price}, rating=${card.scores.rating}, features=${card.scores.features}, trust=${card.scores.trust}`);
    console.log(`   Sentiment: ${card.sentiment.positive}% positive, spamRatio=${card.sentiment.spamRatio}`);
    console.log(`   Bullet Points: ${card.explanation.bulletPoints.join(' | ')}`);
    console.log(`   Short: ${card.explanation.short}`);
    console.log(`   Natural: ${card.explanation.natural ?? '(none)'}`);
    console.log(`   LLM Used: ${card.explanation.llmUsed}`);
    console.log(`   CTA: ${card.cta.text} → ${card.cta.url}`);
  });

  console.log('\n🔁 Suggested Follow-ups:', explanationOutput.suggestedFollowups.join(' | '));
  console.log('════════════════════════════════════════');

  // Optional: Show what's now in the knowledge cache
  console.log('\n📋 Brands persisted:');
  cache.getBrands().forEach(b => console.log(`   - ${b}`));
  console.log('\n📋 Features persisted (first 20):');
  cache.getFeatures().slice(0, 20).forEach(f => console.log(`   - ${f}`));
}

runIntegrationTest()
  .catch(e => {
    console.error('❌ Integration test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });