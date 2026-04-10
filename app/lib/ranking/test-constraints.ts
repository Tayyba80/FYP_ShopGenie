// test-constraint-extractor.ts
// Run with: npx tsx app/lib/ranking/test-constraint-extractor.ts

import { ConstraintExtractor } from './constraintExtractor';

// ----------------------------------------------------------------------
// 1. Initialize canonical features from a mock catalog (in production this would come from DB)
// ----------------------------------------------------------------------
const allSpecs = new Set([
  // Headphones
  'battery life', 'sound quality', 'noise cancellation', 'wireless', 'bluetooth',
  'bass', 'comfort', 'durability', 'waterproof', 'fast charging', 'microphone',
  'ANC', 'transparency mode', 'touch controls', 'foldable', 'carrying case',
  'deep bass', 'long battery', 'hi-fi audio', 'low latency', 'usb-c charging',
  '3.5mm jack', 'active noise cancelling', 'ambient mode', 'voice assistant',
  'multi-device pairing', 'sweat resistant', 'gaming mode', 'rgb lighting',
  'ergonomic design', 'memory foam', 'detachable cable', 'hdr', 'smart features',
  'oled', '5g', '128gb storage', 'size 10',
  // Apparel (jeans, heels, etc.)
  'slim fit', 'straight leg', 'skinny', 'bootcut', 'high waist', 'low rise',
  'stretch', 'distressed', 'ripped', 'faded', 'raw denim', 'selvedge',
  'cotton', 'polyester', 'spandex', 'leather', 'suede',
  // Footwear
  'heel height', 'platform', 'stiletto', 'wedge', 'block heel', 'ankle strap',
  'pointed toe', 'round toe', 'open toe', 'slingback', 'cushioned insole',
  'arch support', 'non-slip', 'waterproof', 'breathable',
  // General
  'color', 'size', 'material', 'weight', 'dimensions', 'warranty'
]);
ConstraintExtractor.initializeCanonicalFeatures(allSpecs);

// ----------------------------------------------------------------------
// 2. Test cases covering multiple categories
// ----------------------------------------------------------------------
const testCases = [
  {
    category: 'Headphones',
    query: 'I need headphones between 2000 and 3000 rs with good sound quality and long battery life, no wireless please',
    expected: {
      currency: 'PKR',
      minPrice: 2000,
      maxPrice: 3000,
      minRating: undefined,
      brands: [],
      desiredFeatures: ['sound quality', 'battery life', 'long battery'],
      excludedFeatures: ['wireless'],
    }
  },
  {
    category: 'Headphones',
    query: 'Sony headphones under $100 with noise cancelling and at least 4 star rating',
    expected: {
      currency: 'USD',
      maxPrice: 100,
      minRating: 4,
      brands: ['sony'],
      desiredFeatures: ['noise cancellation'],
      excludedFeatures: [],
    }
  },
  {
    category: 'Headphones',
    query: 'Budget earphones above 1000 PKR, good bass, not bluetooth, black color',
    expected: {
      currency: 'PKR',
      minPrice: 1000,
      brands: [],
      desiredFeatures: ['bass'],
      excludedFeatures: ['bluetooth'],
    }
  },
  {
    category: 'Jeans',
    query: "Levi's jeans under 5000 INR with slim fit and stretch, not skinny",
    expected: {
      currency: 'INR',
      maxPrice: 5000,
      brands: ["levi's"],
      desiredFeatures: ['slim fit', 'stretch'],
      excludedFeatures: ['skinny'],
    }
  },
  {
    category: 'Jeans',
    query: 'Black denim jeans size 32 waist, straight leg, under 4000',
    expected: {
      currency: 'USD', // default
      maxPrice: 4000,
      brands: [],
      desiredFeatures: ['straight leg'],
      excludedFeatures: [],
    }
  },
  {
    category: 'Heels',
    query: 'Stiletto heels with ankle strap, size 8, max $80, red color',
    expected: {
      currency: 'USD',
      maxPrice: 80,
      brands: [],
      desiredFeatures: ['stiletto', 'ankle strap'],
      excludedFeatures: [],
    }
  },
  {
    category: 'Heels',
    query: 'Comfortable block heels for work, no more than 2500 pkr, size 7',
    expected: {
      currency: 'PKR',
      maxPrice: 2500,
      desiredFeatures: ['block heel'],
      excludedFeatures: [],
    }
  },
  {
    category: 'TV',
    query: '4K TV between 50000 and 80000 INR with HDR and smart features, not OLED',
    expected: {
      currency: 'INR',
      minPrice: 50000,
      maxPrice: 80000,
      desiredFeatures: ['hdr', 'smart features'],
      excludedFeatures: ['oled'],
    }
  },
  {
    category: 'Phone',
    query: 'Samsung phone under 60000 with 5G and 128GB storage, at least 4.5 rating',
    expected: {
      currency: 'USD',
      maxPrice: 60000,
      minRating: 4.5,
      brands: ['samsung'],
      desiredFeatures: ['5g', '128gb storage'],
    }
  },
  {
    category: 'Shoes',
    query: 'Running shoes size 10 under 5000 pkr with arch support',
    expected: {
      currency: 'PKR',
      maxPrice: 5000,
      desiredFeatures: ['arch support'],
    }
  },
  {
    category: 'General',
    query: 'best headphones for gym',
    expected: {
      desiredFeatures: [], // Gym might be context, not a spec
    }
  }
];

// ----------------------------------------------------------------------
// 3. Validation helper
// ----------------------------------------------------------------------
function arraysOverlap(arr1: string[], arr2: string[]): boolean {
  const set1 = new Set(arr1.map(s => s.toLowerCase()));
  return arr2.some(s => set1.has(s.toLowerCase()));
}

function validate(actual: any, expected: any, query: string): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  // Currency
  if (expected.currency && actual.currency !== expected.currency) {
    errors.push(`Currency: expected ${expected.currency}, got ${actual.currency}`);
  }
  // Price
  if (expected.minPrice !== undefined && actual.minPrice !== expected.minPrice) {
    errors.push(`Min price: expected ${expected.minPrice}, got ${actual.minPrice}`);
  }
  if (expected.maxPrice !== undefined && actual.maxPrice !== expected.maxPrice) {
    errors.push(`Max price: expected ${expected.maxPrice}, got ${actual.maxPrice}`);
  }
  // Rating
  if (expected.minRating !== undefined && actual.minRating !== expected.minRating) {
    errors.push(`Min rating: expected ${expected.minRating}, got ${actual.minRating}`);
  }
  // Brands
  if (expected.brands) {
    for (const brand of expected.brands) {
      if (!actual.brands.some((b: string) => b.includes(brand) || brand.includes(b))) {
        errors.push(`Brand '${brand}' not found. Found: ${actual.brands.join(', ')}`);
      }
    }
  }
  // Desired features (allow fuzzy match)
  if (expected.desiredFeatures) {
    for (const feat of expected.desiredFeatures) {
      const found = actual.desiredFeatures.some((f: string) => 
        f.includes(feat) || feat.includes(f) || levenshteinDistance(f, feat) <= 3
      );
      if (!found) {
        errors.push(`Desired feature '${feat}' missing. Found: ${actual.desiredFeatures.join(', ')}`);
      }
    }
  }
  // Excluded features
  if (expected.excludedFeatures) {
    for (const feat of expected.excludedFeatures) {
      const found = actual.excludedFeatures.some((f: string) => 
        f.includes(feat) || feat.includes(f)
      );
      if (!found) {
        errors.push(`Excluded feature '${feat}' missing. Found: ${actual.excludedFeatures.join(', ')}`);
      }
    }
  }

  return { passed: errors.length === 0, errors };
}

function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      matrix[j][i] = Math.min(
        matrix[j][i-1] + 1,
        matrix[j-1][i] + 1,
        matrix[j-1][i-1] + (a[i-1] === b[j-1] ? 0 : 1)
      );
    }
  }
  return matrix[b.length][a.length];
}

// ----------------------------------------------------------------------
// 4. Run tests
// ----------------------------------------------------------------------
async function runTests() {
  console.log('🧪 Testing ConstraintExtractor with Real Models\n');
  console.log(`Canonical features: ${ConstraintExtractor['canonicalFeatures'].length}\n`);
  console.log('='.repeat(80));

  let passed = 0, failed = 0;

  for (const test of testCases) {
    console.log(`\n📝 [${test.category}] Query: "${test.query}"`);
    const extractor = new ConstraintExtractor(test.query);
    const actual = await extractor.extract();

    console.log('📊 Extracted:');
    console.log(`  💰 Price: ${actual.minPrice ?? '?'} - ${actual.maxPrice ?? '?'} ${actual.currency}`);
    console.log(`  ⭐ Rating: ${actual.minRating ? '≥ ' + actual.minRating : 'none'}`);
    console.log(`  🏷️ Brands: ${actual.brands.length ? actual.brands.join(', ') : 'none'}`);
    console.log(`  ✅ Desired: ${actual.desiredFeatures.join(', ') || 'none'}`);
    console.log(`  ❌ Excluded: ${actual.excludedFeatures.join(', ') || 'none'}`);

    const result = validate(actual, test.expected, test.query);
    if (result.passed) {
      console.log('  ✅ PASSED');
      passed++;
    } else {
      console.log('  ❌ FAILED');
      result.errors.forEach(e => console.log(`     - ${e}`));
      failed++;
    }

    // Show all constraints with confidence
    console.log('  📋 Constraints:');
    actual.constraints.forEach(c => {
      console.log(`     • ${c.type}: ${JSON.stringify(c.value)} (${c.confidence.toFixed(2)}) [${c.sourceText}]`);
    });
    console.log('-'.repeat(80));
  }

  console.log(`\n📈 Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);