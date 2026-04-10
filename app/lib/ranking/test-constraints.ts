// test-constraint-extractor.ts
// Run with: npx ts-node test-constraint-extractor.ts

import { ConstraintExtractor, UserConstraints } from '@/lib/ranking/constraintExtractor';

// ----------------------------------------------------------------------
// 1. Initialize canonical features (what your product catalog would provide)
// ----------------------------------------------------------------------
const mockSpecs = new Set([
  'battery life', 'sound quality', 'noise cancellation', 'wireless', 'bluetooth',
  'bass', 'comfort', 'durability', 'waterproof', 'fast charging', 'microphone',
  'ANC', 'transparency mode', 'touch controls', 'foldable', 'carrying case',
  'deep bass', 'long battery', 'hi-fi audio', 'low latency'
]);
ConstraintExtractor.initializeCanonicalFeatures(mockSpecs);

// ----------------------------------------------------------------------
// 2. Mock the feature embedder to avoid downloading models
//    (You can remove this when you're ready to use real embeddings)
// ----------------------------------------------------------------------
// @ts-ignore - override the private method for testing
ConstraintExtractor.prototype.extractFeaturesSemantic = async function(
  this: ConstraintExtractor,
  constraints: UserConstraints
): Promise<void> {
  console.log('  [Mock] Using keyword + fuzzy matching (real embeddings disabled for test)');
  
  // Simple keyword mapping for demonstration
  const query = (this as any).query; // access private field
  
  const keywordToFeature: Record<string, string> = {
    'battery': 'battery life',
    'sound': 'sound quality',
    'noise': 'noise cancellation',
    'cancelling': 'noise cancellation',
    'cancellation': 'noise cancellation',
    'wireless': 'wireless',
    'bluetooth': 'bluetooth',
    'bass': 'bass',
    'comfort': 'comfort',
    'waterproof': 'waterproof',
    'charging': 'fast charging',
    'mic': 'microphone',
    'microphone': 'microphone',
  };
  
  // Also handle multi-word phrases
  const phrases = [
    'battery life', 'sound quality', 'noise cancellation', 'noise cancelling',
    'fast charging', 'deep bass', 'long battery'
  ];
  
  // Check keywords
  Object.entries(keywordToFeature).forEach(([keyword, feature]) => {
    if (query.includes(keyword) && !constraints.desiredFeatures.includes(feature)) {
      constraints.desiredFeatures.push(feature);
      constraints.constraints.push({
        type: 'feature',
        value: feature,
        confidence: 0.8,
        sourceText: keyword
      });
    }
  });
  
  // Check phrases
  phrases.forEach(phrase => {
    if (query.includes(phrase)) {
      const feature = phrase; // use phrase as feature directly
      if (!constraints.desiredFeatures.includes(feature)) {
        constraints.desiredFeatures.push(feature);
        constraints.constraints.push({
          type: 'feature',
          value: feature,
          confidence: 0.85,
          sourceText: phrase
        });
      }
    }
  });
  
  // Simulate fuzzy fallback: if "batery" appears, map to battery life
  if (query.includes('batery') && !constraints.desiredFeatures.includes('battery life')) {
    constraints.desiredFeatures.push('battery life');
    constraints.constraints.push({
      type: 'feature',
      value: 'battery life',
      confidence: 0.6,
      sourceText: 'batery'
    });
  }
};

// Also mock the static embedder property to avoid Transformer init
// @ts-ignore - set static property
ConstraintExtractor.featureEmbedder = {
  // dummy embedder
  async embed(texts: string[]) {
    return texts.map(() => new Array(384).fill(0.1));
  }
};

// ----------------------------------------------------------------------
// 3. Run test cases
// ----------------------------------------------------------------------
async function runTests() {
  const testQueries = [
    // Basic price range with features
    "I need headphones between 2000 and 3000 rs with good sound quality and long battery life, no wireless please",
    // Different currency, brand, rating
    "Sony headphones under $100 with noise cancelling and at least 4 star rating",
    // Min price only, excluded feature, color
    "Budget earphones above 1000 PKR, good bass, not bluetooth, black color",
    // Fuzzy spelling and complex negation
    "I want a headphone with great batery life and noise cancelation but without microphone",
    // Multiple brands and features
    "Looking for Bose or JBL wireless headphones under 25000 pkr with ANC and deep bass",
    // Price range with decimals and commas
    "Headphones between ₹2,500.50 and ₹3,000 with USB-C charging",
    // Edge: no constraints
    "best headphones for gym",
    // Edge: only exclusion
    "earbuds no wire",
  ];

  console.log('🧪 Testing ConstraintExtractor with Mock Embeddings\n');
  console.log('Canonical features loaded:', Array.from(mockSpecs).length, 'features\n');
  console.log('='.repeat(80));

  for (const query of testQueries) {
    console.log(`\n📝 Query: "${query}"`);
    const extractor = new ConstraintExtractor(query);
    const constraints = await extractor.extract();
    
    console.log('📊 Extracted Constraints:');
    console.log(`  💰 Price: ${constraints.minPrice ? 'min ' + constraints.minPrice : 'no min'} | ${constraints.maxPrice ? 'max ' + constraints.maxPrice : 'no max'} (${constraints.currency})`);
    console.log(`  ⭐ Rating: ${constraints.minRating ? '≥ ' + constraints.minRating + ' stars' : 'not specified'}`);
    console.log(`  🏷️ Brands: ${constraints.brands.length ? constraints.brands.join(', ') : 'none'}`);
    console.log(`  ✅ Desired Features: ${constraints.desiredFeatures.length ? constraints.desiredFeatures.join(', ') : 'none'}`);
    console.log(`  ❌ Excluded Features: ${constraints.excludedFeatures.length ? constraints.excludedFeatures.join(', ') : 'none'}`);
    console.log(`  🎨 Colors: ${constraints.colors.length ? constraints.colors.join(', ') : 'none'}`);
    console.log(`  🔌 Connectivity: ${constraints.connectivity.length ? constraints.connectivity.join(', ') : 'none'}`);
    
    console.log('\n  📋 All Constraints with confidence:');
    constraints.constraints.forEach(c => {
      console.log(`     • ${c.type}: ${JSON.stringify(c.value)} (conf: ${c.confidence.toFixed(2)}) [from: "${c.sourceText || 'N/A'}"]`);
    });
    console.log('-'.repeat(80));
  }
}

// ----------------------------------------------------------------------
// 4. Execute
// ----------------------------------------------------------------------
runTests().catch(console.error);