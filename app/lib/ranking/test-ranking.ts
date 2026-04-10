// // test-ranking.ts
// // Run with: npx ts-node test-ranking.ts

// import { RankingEngine } from '@/lib/ranking/rankingEngine';
// import { Product } from '@/types/product';

// // Dummy product generator
// function createDummyProducts(): Product[] {
//   const baseProduct = (id: string, platform: string, price: number, ratingAvg: number, ratingCount: number, reviews: any[]): Product => ({
//     productId: `${platform}_${id}`,
//     platform,
//     title: `Headphones Model ${id}`,
//     productUrl: `https://${platform}.com/product/${id}`,
//     mainImageUrl: 'https://via.placeholder.com/150',
//     brand: 'BrandX',
//     model: `H-${id}`,
//     category: 'Electronics > Headphones',
//     description: 'Wireless headphones with noise cancellation',
//     keyFeatures: ['Wireless', 'Noise Cancelling', '20h battery'],
//     price: { amount: price, currency: 'PKR', originalAmount: price + 500, shippingCost: 0 },
//     availability: 'in_stock',
//     rating: { average: ratingAvg, count: ratingCount },
//     reviews,
//     specifications: { batteryLife: '20 hours', bluetooth: '5.0' },
//     timestamp: new Date().toISOString(),
//   });

//   // Good product with many genuine reviews
//   const p1 = baseProduct('P1', 'daraz', 2500, 4.7, 150, [
//     { reviewerName: 'Ali', text: 'Amazing sound quality and battery life!', rating: 5 },
//     { reviewerName: 'Sara', text: 'Very comfortable for long use.', rating: 5 },
//     { reviewerName: 'Ahmed', text: 'Good value for money.', rating: 4 },
//     { reviewerName: 'Zara', text: 'Bass is deep, love it.', rating: 5 },
//     { reviewerName: 'Omar', text: 'Noise cancellation works well.', rating: 4 },
//   ]);

//   // Good rating but suspicious reviews (possible spam)
//   const p2 = baseProduct('P2', 'temu', 2200, 4.9, 30, [
//     { reviewerName: 'user1', text: 'Great product!', rating: 5 },
//     { reviewerName: 'user1', text: 'Excellent!', rating: 5 },
//     { reviewerName: 'user1', text: 'Superb!', rating: 5 },
//     { reviewerName: 'user2', text: 'Good', rating: 5 },
//     { reviewerName: 'user2', text: 'Nice', rating: 5 },
//     { reviewerName: 'user3', text: 'Not as expected, broke after a week', rating: 1 },
//   ]);

//   // Price out of range
//   const p3 = baseProduct('P3', 'daraz', 4500, 4.5, 200, [
//     { reviewerName: 'Asif', text: 'Premium feel and sound.', rating: 5 },
//     { reviewerName: 'Bilal', text: 'Worth the price.', rating: 5 },
//   ]);

//   // Low rating, negative sentiment
//   const p4 = baseProduct('P4', 'temu', 2800, 2.5, 10, [
//     { reviewerName: 'Sana', text: 'Battery dies quickly, poor sound.', rating: 2 },
//     { reviewerName: 'Faisal', text: 'Not comfortable.', rating: 3 },
//     { reviewerName: 'Nadia', text: 'Stopped working after 3 days.', rating: 1 },
//   ]);

//   // Good but few reviews
//   const p5 = baseProduct('P5', 'daraz', 2700, 5.0, 3, [
//     { reviewerName: 'Tariq', text: 'Perfect!', rating: 5 },
//     { reviewerName: 'Hina', text: 'Loving it!', rating: 5 },
//   ]);

//   // Matches features exactly
//   const p6 = baseProduct('P6', 'temu', 3000, 4.3, 50, [
//     { reviewerName: 'Kamran', text: 'Battery lasts long, sound is clear.', rating: 4 },
//     { reviewerName: 'Laila', text: 'Good for calls and music.', rating: 4 },
//     { reviewerName: 'Rashid', text: 'Decent but not great.', rating: 3 },
//   ]);
//   p6.keyFeatures = ['30h battery life', 'Hi-Fi sound quality', 'Deep bass'];

//   // Inside budget, decent reviews
//   const p7 = baseProduct('P7', 'daraz', 2100, 4.0, 80, [
//     { reviewerName: 'Usman', text: 'Works fine, nothing special.', rating: 4 },
//     { reviewerName: 'Farah', text: 'Good for the price.', rating: 4 },
//   ]);

//   return [p1, p2, p3, p4, p5, p6, p7];
// }

// const userQuery = "I want headphones between 2000 and 3000 rs with good sound quality and battery life";

// async function testRanking() {
//   const products = createDummyProducts();
//   console.log(`Testing ranking with ${products.length} dummy products.`);
//   console.log('User query:', userQuery);
//   console.log('----------------------------------------');

//   const engine = new RankingEngine();
//   const ranked = await engine.rankProducts(products, userQuery);

//   console.log('Top 5 Ranked Products:\n');
//   ranked.forEach((rp, index) => {
//     console.log(`${index + 1}. ${rp.product.title} (${rp.product.platform})`);
//     console.log(`   Score: ${rp.score.toFixed(3)}`);
//     console.log(`   Price: Rs ${rp.product.price.amount}`);
//     console.log(`   Rating: ${rp.product.rating.average}★ (${rp.product.rating.count} reviews)`);
//     console.log(`   Sentiment: +${rp.sentimentSummary.positive}/-${rp.sentimentSummary.negative} (spam ratio: ${(rp.sentimentSummary.spamRatio * 100).toFixed(1)}%)`);
//     console.log(`   Matching features: ${rp.matchingFeatures.join(', ') || 'none'}`);
//     console.log(`   Reason: ${rp.rankingReason}`);
//     console.log(`   Score breakdown: price=${rp.breakdown.priceScore.toFixed(2)}, rating=${rp.breakdown.ratingScore.toFixed(2)}, sentiment=${rp.breakdown.sentimentScore.toFixed(2)}, feature=${rp.breakdown.featureScore.toFixed(2)}, penalty=${rp.breakdown.authenticityPenalty.toFixed(2)}`);
//     console.log('');
//   });
// }

// testRanking().catch(console.error);
// test-ranking.ts
// Run with: npx tsx lib/ranking/test-ranking.ts

import { RankingEngine } from './rankingEngine';
import { ConstraintExtractor } from './constraintExtractor';
import { Product } from '@/types/product';

// ----------------------------------------------------------------------
// Dummy product generators for different categories
// ----------------------------------------------------------------------

function generateHeadphones(): Product[] {
  const baseHeadphone = (id: string, platform: string, price: number, ratingAvg: number, ratingCount: number, specs: any, reviews: any[]): Product => ({
    productId: `${platform}_${id}`,
    platform,
    title: `Headphones Model ${id}`,
    productUrl: `https://${platform}.com/product/${id}`,
    mainImageUrl: 'https://via.placeholder.com/150',
    brand: specs.brand || 'Generic',
    model: `H-${id}`,
    category: 'Electronics > Headphones',
    description: 'Wireless headphones',
    keyFeatures: specs.keyFeatures || [],
    price: { amount: price, currency: 'PKR', originalAmount: price + 500, shippingCost: 0 },
    availability: 'in_stock',
    rating: { average: ratingAvg, count: ratingCount },
    reviews,
    specifications: specs,
    timestamp: new Date().toISOString(),
  });

  return [
    baseHeadphone('P1', 'daraz', 2500, 4.7, 150, 
      { brand: 'Sony', batteryLife: '20 hours', bluetooth: '5.0', noiseCancellation: true, soundQuality: 'Hi-Fi' },
      [
        { reviewerName: 'Ali', text: 'Amazing sound quality and battery life!', rating: 5 },
        { reviewerName: 'Sara', text: 'Very comfortable for long use.', rating: 5 },
      ]),
    baseHeadphone('P2', 'temu', 2200, 4.9, 30,
      { brand: 'Anker', batteryLife: '15 hours', bluetooth: '5.0', noiseCancellation: false, soundQuality: 'Standard' },
      [
        { reviewerName: 'user1', text: 'Great product!', rating: 5 },
        { reviewerName: 'user1', text: 'Excellent!', rating: 5 },
        { reviewerName: 'user3', text: 'Not as expected', rating: 1 },
      ]),
    baseHeadphone('P3', 'daraz', 4500, 4.5, 200,
      { brand: 'Bose', batteryLife: '25 hours', bluetooth: '5.2', noiseCancellation: true, soundQuality: 'Premium' },
      [
        { reviewerName: 'Asif', text: 'Premium feel and sound.', rating: 5 },
      ]),
    baseHeadphone('P4', 'temu', 2800, 2.5, 10,
      { brand: 'Unknown', batteryLife: '8 hours', bluetooth: '4.2', noiseCancellation: false, soundQuality: 'Poor' },
      [
        { reviewerName: 'Sana', text: 'Battery dies quickly, poor sound.', rating: 2 },
      ]),
    baseHeadphone('P5', 'daraz', 2700, 5.0, 3,
      { brand: 'JBL', batteryLife: '18 hours', bluetooth: '5.0', noiseCancellation: false, soundQuality: 'Good' },
      [
        { reviewerName: 'Tariq', text: 'Perfect!', rating: 5 },
      ]),
    baseHeadphone('P6', 'temu', 3000, 4.3, 50,
      { brand: 'Sennheiser', batteryLife: '30 hours', bluetooth: '5.1', noiseCancellation: true, soundQuality: 'Hi-Fi', deepBass: true },
      [
        { reviewerName: 'Kamran', text: 'Battery lasts long, sound is clear.', rating: 4 },
      ]),
  ];
}

function generateJeans(): Product[] {
  const baseJean = (id: string, platform: string, price: number, ratingAvg: number, ratingCount: number, specs: any, reviews: any[]): Product => ({
    productId: `${platform}_${id}`,
    platform,
    title: `Denim Jeans ${id}`,
    productUrl: `https://${platform}.com/product/${id}`,
    mainImageUrl: 'https://via.placeholder.com/150',
    brand: specs.brand || 'Generic',
    model: `J-${id}`,
    category: 'Clothing > Jeans',
    description: 'Stylish denim jeans',
    keyFeatures: specs.keyFeatures || [],
    price: { amount: price, currency: 'PKR', originalAmount: price + 500, shippingCost: 0 },
    availability: 'in_stock',
    rating: { average: ratingAvg, count: ratingCount },
    reviews,
    specifications: specs,
    timestamp: new Date().toISOString(),
  });

  return [
    baseJean('J1', 'daraz', 3500, 4.5, 120,
      { brand: "Levi's", fit: 'Slim Fit', stretch: true, color: 'Blue', waist: '32' },
      [{ reviewerName: 'Ali', text: 'Perfect fit, very comfortable.', rating: 5 }]),
    baseJean('J2', 'temu', 2800, 4.2, 80,
      { brand: 'Wrangler', fit: 'Straight Leg', stretch: false, color: 'Black', waist: '34' },
      [{ reviewerName: 'Sara', text: 'Good quality denim.', rating: 4 }]),
    baseJean('J3', 'daraz', 4200, 4.8, 200,
      { brand: 'Diesel', fit: 'Slim Fit', stretch: true, color: 'Dark Blue', waist: '30' },
      [{ reviewerName: 'Omar', text: 'Expensive but worth it.', rating: 5 }]),
    baseJean('J4', 'temu', 1500, 3.5, 15,
      { brand: 'NoName', fit: 'Skinny', stretch: false, color: 'Light Blue', waist: '28' },
      [{ reviewerName: 'Zara', text: 'Cheap material, ripped after one wash.', rating: 2 }]),
  ];
}

function generateHeels(): Product[] {
  const baseHeel = (id: string, platform: string, price: number, ratingAvg: number, ratingCount: number, specs: any, reviews: any[]): Product => ({
    productId: `${platform}_${id}`,
    platform,
    title: `Women's Heels ${id}`,
    productUrl: `https://${platform}.com/product/${id}`,
    mainImageUrl: 'https://via.placeholder.com/150',
    brand: specs.brand || 'Generic',
    model: `H-${id}`,
    category: 'Footwear > Heels',
    description: 'Elegant heels',
    keyFeatures: specs.keyFeatures || [],
    price: { amount: price, currency: 'PKR', originalAmount: price + 500, shippingCost: 0 },
    availability: 'in_stock',
    rating: { average: ratingAvg, count: ratingCount },
    reviews,
    specifications: specs,
    timestamp: new Date().toISOString(),
  });

  return [
    baseHeel('H1', 'daraz', 2500, 4.6, 90,
      { brand: 'Stylo', heelType: 'Stiletto', heelHeight: '4 inch', color: 'Red', ankleStrap: true },
      [{ reviewerName: 'Hina', text: 'Beautiful heels, very comfortable.', rating: 5 }]),
    baseHeel('H2', 'temu', 1800, 4.0, 40,
      { brand: 'Borjan', heelType: 'Block Heel', heelHeight: '2 inch', color: 'Black', ankleStrap: false },
      [{ reviewerName: 'Sana', text: 'Good for office wear.', rating: 4 }]),
    baseHeel('H3', 'daraz', 3200, 4.9, 150,
      { brand: 'Nine West', heelType: 'Wedge', heelHeight: '3 inch', color: 'Nude', ankleStrap: true },
      [{ reviewerName: 'Laila', text: 'Super comfy wedges!', rating: 5 }]),
    baseHeel('H4', 'temu', 1200, 3.0, 10,
      { brand: 'Fashion', heelType: 'Stiletto', heelHeight: '5 inch', color: 'Silver', ankleStrap: false },
      [{ reviewerName: 'Nida', text: 'Too high, painful to walk.', rating: 2 }]),
  ];
}

// ----------------------------------------------------------------------
// Test cases
// ----------------------------------------------------------------------
const testCases = [
  {
    category: 'Headphones',
    query: 'I want headphones between 2000 and 3000 rs with good sound quality and battery life, no wireless please',
    generateProducts: generateHeadphones,
    expected: {
      priceRange: { min: 2000, max: 3000 },
      brands: [] as string[],
      desired: ['sound quality', 'battery life'],
      excluded: ['wireless'],
    },
  },
  {
    category: 'Headphones',
    query: 'Sony headphones under $100 with noise cancelling and at least 4 star rating',
    generateProducts: generateHeadphones,
    expected: {
      priceRange: { max: 100, currency: 'USD' },
      brands: ['sony'],
      minRating: 4,
      desired: ['noise cancellation'],
    },
  },
  {
    category: 'Jeans',
    query: "Levi's jeans under 4000 INR with slim fit and stretch, not skinny",
    generateProducts: generateJeans,
    expected: {
      priceRange: { max: 4000, currency: 'INR' },
      brands: ["levi's"],
      desired: ['slim fit', 'stretch'],
      excluded: ['skinny'],
    },
  },
  {
    category: 'Heels',
    query: 'Comfortable block heels for work, no more than 2500 pkr, size 7',
    generateProducts: generateHeels,
    expected: {
      priceRange: { max: 2500, currency: 'PKR' },
      desired: ['block heel'],
    },
  },
  {
    category: 'Heels',
    query: 'Stiletto heels with ankle strap under 3000',
    generateProducts: generateHeels,
    expected: {
      priceRange: { max: 3000 },
      desired: ['stiletto', 'ankle strap'],
    },
  },
];

// ----------------------------------------------------------------------
// Run tests
// ----------------------------------------------------------------------
async function runAllTests() {
  console.log('🧪 Testing Ranking Engine with Multiple Categories\n');
  console.log('='.repeat(80));

  const engine = new RankingEngine();
  let totalTests = 0;
  let passed = 0;

  for (const testCase of testCases) {
    totalTests++;
    console.log(`\n📝 [${testCase.category}] Query: "${testCase.query}"`);
    
    // Generate products
    const products = testCase.generateProducts();
    
    // Extract canonical features from these products and initialize extractor
    const specKeys = new Set<string>();
    for (const product of products) {
      if (product.specifications) {
        Object.keys(product.specifications).forEach(key => specKeys.add(key));
      }
    }
    ConstraintExtractor.initializeCanonicalFeatures(specKeys);

    // Rank products
    const ranked = await engine.rankProducts(products, testCase.query);
    
    console.log(`\n  📊 Top 3 Ranked Products:`);
    ranked.slice(0, 3).forEach((rp, idx) => {
      console.log(`     ${idx+1}. ${rp.product.title} (${rp.product.brand}) - Score: ${rp.score.toFixed(3)}`);
      console.log(`        Price: ${rp.product.price.amount} ${rp.product.price.currency}, Rating: ${rp.product.rating.average}★`);
      console.log(`        Matched: ${rp.matchingFeatures.join(', ') || 'none'}`);
    });

    // Basic validation (check if top product meets price constraint)
    const topProduct = ranked[0]?.product;
    let constraintsOk = true;
    if (testCase.expected.priceRange) {
      const { min, max, currency } = testCase.expected.priceRange;
      if (min && topProduct.price.amount < min) constraintsOk = false;
      if (max && topProduct.price.amount > max) constraintsOk = false;
    }
    
    if (constraintsOk) {
      console.log(`  ✅ Test passed (top product respects constraints)`);
      passed++;
    } else {
      console.log(`  ❌ Test failed (top product violates constraints)`);
    }
    
    console.log('-'.repeat(80));
  }

  console.log(`\n📈 Summary: ${passed}/${totalTests} tests passed.`);
  if (passed < totalTests) process.exit(1);
}

runAllTests().catch(console.error);