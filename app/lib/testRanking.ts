// // lib/testRanking.ts
// import { RankingEngine } from './rankingEngine.test';

// // Define interfaces based on what you have in types/index.ts
// interface TestProduct {
//   id: number | string;
//   name: string;
//   price: number;
//   rating: number;
//   reviews?: number;
//   reviewsText?: string[];
//   features?: string[];
//   deliveryTime?: string;
//   warranty?: string;
//   platform?: string;
//   store?: string;
//   category?: string;
// }

// interface TestQuery {
//   keywords?: string[];
//   categories?: string[];
//   priceRange?: { min: number; max: number };
//   filters?: {
//     maxPrice?: number;
//     minRating?: number;
//   };
// }

// // Create test products with varying quality
// const testProducts: TestProduct[] = [
//   // Excellent product
//   {
//     id: 1,
//     name: "Premium Earbuds",
//     price: 1800,
//     rating: 4.8,
//     reviews: 2500,
//     reviewsText: ["Excellent!", "Best ever!", "Perfect!"],
//     features: ["premium", "noise cancellation"],
//     deliveryTime: "2 days",
//     warranty: "2 years",
//     platform: "daraz",
//     store: "Premium Store",
//     category: "electronics"
//   },
//   // Good product
//   {
//     id: 2,
//     name: "Good Earbuds",
//     price: 1200,
//     rating: 4.3,
//     reviews: 800,
//     reviewsText: ["Good value", "Works well", "Happy with purchase"],
//     features: ["basic", "wireless"],
//     deliveryTime: "3-5 days",
//     warranty: "6 months",
//     platform: "daraz",
//     store: "Good Store",
//     category: "electronics"
//   },
//   // Poor product (should be filtered out or ranked low)
//   {
//     id: 3,
//     name: "Cheap Earbuds",
//     price: 500,
//     rating: 2.5,
//     reviews: 2,
//     reviewsText: ["Broke quickly", "Poor sound"],
//     features: ["cheap"],
//     deliveryTime: "1 week",
//     warranty: "1 month",
//     platform: "daraz",
//     store: "Budget Store",
//     category: "electronics"
//   },
//   // Another good product
//   {
//     id: 4,
//     name: "Mid-range Earbuds",
//     price: 1500,
//     rating: 4.6,
//     reviews: 1500,
//     reviewsText: ["Great sound", "Good battery", "Comfortable"],
//     features: ["wireless", "waterproof"],
//     deliveryTime: "2-3 days",
//     warranty: "1 year",
//     platform: "amazon",
//     store: "Mid Store",
//     category: "electronics"
//   }
// ];

// async function testRanking() {
//   console.log("🚀 Starting SimpleRankingEngine test...\n");
  
//   const engine = new RankingEngine();
  
//   // Test query similar to what your parser might produce
//   const testQuery: TestQuery = {
//     keywords: ["earbuds", "wireless"],
//     categories: ["electronics"],
//     priceRange: { min: 0, max: 2000 },
//     filters: { maxPrice: 2000, minRating: 3.5 }
//   };
  
//   console.log("📋 Test Query:");
//   console.log(JSON.stringify(testQuery, null, 2));
  
//   console.log("\n📦 Input Products:");
//   testProducts.forEach(p => {
//     console.log(`- ${p.name}: $${p.price}, ⭐${p.rating}, 📝${p.reviews} reviews`);
//   });
  
//   console.log("\n🎯 Running ranking algorithm...");
//   const results = await engine.rankProducts(testProducts as any, testQuery as any);
  
//   console.log("\n🏆 RANKED RESULTS:");
//   results.forEach((product: any, index: number) => {
//     console.log(`${index + 1}. ${product.name}`);
//     console.log(`   Price: $${product.price}`);
//     console.log(`   Rating: ⭐${product.rating}`);
//     console.log(`   Reviews: ${product.reviews || 'N/A'}`);
//     console.log(`   Category: ${product.category}`);
//     console.log("   ---");
//   });
  
//   console.log("\n📊 Summary:");
//   console.log(`Total input products: ${testProducts.length}`);
//   console.log(`Products after filtering/ranking: ${results.length}`);
//   console.log(`Top product: ${results[0]?.name || 'None'}`);
  
//   // Test scoring logic
//   console.log("\n🔍 Scoring Debug:");
//   console.log("(This would show individual scores in your actual implementation)");
// }

// // Run the test
// testRanking().catch(console.error);