// test-explanation-module.ts
// Run with: npx tsx test-explanation-module.ts
// Ensure .env.local has USE_LLM=true and GROQ_API_KEY if you want real LLM calls.

import { ShopGenieExplanationModule } from './explanationModule';
import { RankedProduct } from '../../types/product';

async function main() {
  console.log('🚀 Starting Explanation Module test...\n');

  // ─── Build realistic ranked products ────────────────────────────
  const now = new Date().toISOString();

  const rankedProducts: RankedProduct[] = [
    // Product 1 – Top pick
    {
      product: {
        productId: 'daraz-001',
        platform: 'daraz',
        title: 'Samsung Galaxy S24 Ultra 256GB Titanium Gray',
        productUrl: 'https://www.daraz.pk/products/samsung-galaxy-s24-ultra-i123456.html',
        mainImageUrl: 'https://img.daraz.pk/original/abc123.jpg',
        brand: 'Samsung',
        model: 'S24 Ultra',
        category: 'Smartphones',
        description: 'Latest flagship with S Pen, 200MP camera, and titanium frame.',
        keyFeatures: ['200MP Camera', 'S Pen', 'Dynamic AMOLED 2X', 'Snapdragon 8 Gen 3'],
        price: {
          amount: 3499.99,
          currency: 'PKR',
          originalAmount: 3999.99,
          shippingCost: 0,
        },
        availability: 'In Stock',
        estimatedDelivery: '2-5 days',
        rating: {
          average: 4.8,
          count: 12453,
        },
        reviews: [
          { reviewerName: 'TechGuru', text: 'Amazing camera and battery life!', rating: 5, date: '2025-01-15' },
          { reviewerName: 'SatisfiedUser', text: 'Great performance, worth every rupee.', rating: 5, date: '2025-02-10' },
          { reviewerName: 'NeutralBuyer', text: 'Good phone but pricey.', rating: 4, date: '2025-01-28' },
        ],
        specifications: { "Display": "6.8 inch", "RAM": "12GB", "Storage": "256GB" },
        timestamp: now,
      },
      score: 9.4,
      breakdown: {
        priceScore: 0.92,
        ratingScore: 0.98,
        sentimentScore: 0.88,
        featureScore: 0.95,
        credibilityFactor: 0.9,
        hardConstraintPenalty: 0,
        total: 9.4,
      },
      matchingFeatures: ['200MP Camera', 'S Pen', 'Snapdragon 8 Gen 3'],
      missingMustHaveFeatures: [],
      sentimentSummary: {
        positive: 92,
        negative: 3,
        neutral: 5,
        spamRatio: 0.02,
        confidence: 0.95,
      },
      rankingReason: 'High-end specs with exceptional camera and best price-to-performance ratio.',
    },

    // Product 2 – Runner up
    {
      product: {
        productId: 'temu-002',
        platform: 'temu',
        title: 'Xiaomi 14 Ultra 512GB Black',
        productUrl: 'https://www.temu.com/xiaomi-14-ultra-512gb-black.html',
        mainImageUrl: 'https://img.temu.com/xyz789.jpg',
        brand: 'Xiaomi',
        model: '14 Ultra',
        category: 'Smartphones',
        description: 'Leica optics, powerful chipset, and stunning design.',
        keyFeatures: ['Leica Camera', 'Snapdragon 8 Gen 3', '120Hz AMOLED', '90W Charging'],
        price: {
          amount: 2999.99,
          currency: 'PKR',
          shippingCost: 250,
        },
        availability: 'In Stock',
        estimatedDelivery: '5-10 days',
        rating: {
          average: 4.7,
          count: 8542,
        },
        reviews: [],
        specifications: { "Display": "6.73 inch", "RAM": "12GB", "Storage": "512GB" },
        timestamp: now,
      },
      score: 8.7,
      breakdown: {
        priceScore: 0.85,
        ratingScore: 0.91,
        sentimentScore: 0.82,
        featureScore: 0.88,
        credibilityFactor: 0.82,
        hardConstraintPenalty: 0,
        total: 8.7,
      },
      matchingFeatures: ['Leica Camera', '90W Charging'],
      missingMustHaveFeatures: ['S Pen'],
      sentimentSummary: {
        positive: 85,
        negative: 5,
        neutral: 10,
        spamRatio: 0.05,
        confidence: 0.88,
      },
      rankingReason: 'Excellent camera and fast charging, slightly lower trust due to newer store.',
    },

    // Product 3 – Budget option
    {
      product: {
        productId: 'daraz-003',
        platform: 'daraz',
        title: 'OnePlus 12R 128GB Cool Blue',
        productUrl: 'https://www.daraz.pk/oneplus-12r-128gb-i789012.html',
        mainImageUrl: 'https://img.daraz.pk/oneplus12r.jpg',
        brand: 'OnePlus',
        model: '12R',
        category: 'Smartphones',
        description: 'Flagship killer with smooth performance and great display.',
        keyFeatures: ['120Hz AMOLED', 'Snapdragon 8 Gen 2', '100W Charging'],
        price: {
          amount: 1899.99,
          currency: 'PKR',
          originalAmount: 2099.99,
          shippingCost: 0,
        },
        availability: 'In Stock',
        estimatedDelivery: '3-7 days',
        rating: {
          average: 4.5,
          count: 6340,
        },
        reviews: [],
        specifications: { "Display": "6.78 inch", "RAM": "8GB", "Storage": "128GB" },
        timestamp: now,
      },
      score: 8.1,
      breakdown: {
        priceScore: 0.75,
        ratingScore: 0.82,
        sentimentScore: 0.73,
        featureScore: 0.78,
        credibilityFactor: 0.88,
        hardConstraintPenalty: 0,
        total: 8.1,
      },
      matchingFeatures: ['120Hz AMOLED', '100W Charging'],
      missingMustHaveFeatures: ['200MP Camera'],
      sentimentSummary: {
        positive: 78,
        negative: 8,
        neutral: 14,
        spamRatio: 0.04,
        confidence: 0.9,
      },
      rankingReason: 'Good value for money with reliable performance.',
    },
  ];

  // Instantiate the explanation module
  const explainer = new ShopGenieExplanationModule();

  // Call process
  const result = await explainer.process('best flagship smartphone under 4000 PKR', rankedProducts);

  // Print result in a structured way
  console.log('════════════════════════════════════════');
  console.log('📊 Explanation Output:');
  console.log('Query:', result.query);
  console.log('Timestamp:', result.timestamp);
  console.log('Total products processed:', result.totalProducts);
  console.log('Total found:', result.totalFound);
  console.log('Stats:', result.stats);

  console.log('\n💬 Chat Response:');
  console.log(result.chatResponse);

  console.log('\n🛍️ Product Cards:');
  result.productCards.forEach((card, idx) => {
    console.log(`\n--- Card ${idx + 1} (Rank ${card.rank}) ---`);
    console.log('Name:', card.name);
    console.log('Platform:', card.platform);
    console.log('Price:', card.price.display, `(original: ${card.price.original})`);
    console.log('Rating:', card.rating.display, 'from', card.rating.count, 'reviews');
    console.log('Key Features:', card.keyFeatures.join(', '));
    console.log('Badges:', card.badges.map(b => b.text).join(' | '));
    console.log('Scores:', card.scores);
    console.log('Sentiment:', card.sentiment);
    console.log('Explanation:');
    console.log('  Bullets:', card.explanation.bulletPoints);
    console.log('  Short:', card.explanation.short);
    console.log('  Natural:', card.explanation.natural ?? '(LLM not used)');
    console.log('  Ranking Reason:', card.explanation.rankingReason);
    console.log('  LLM Used:', card.explanation.llmUsed);
    console.log('CTA:', card.cta.text, '→', card.cta.url);
  });

  console.log('\n🔁 Suggested Follow-ups:', result.suggestedFollowups);
  console.log('════════════════════════════════════════');
}

main().catch(console.error);