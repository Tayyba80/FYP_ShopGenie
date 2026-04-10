// scripts/test-review-analyzer.ts
import { ReviewAnalyzer } from '@/lib/ranking/reviewAnalyzer';
import { Review } from '@/types/product';

// -----------------------------------------------------------------------------
// Sample reviews simulating real Daraz products
// -----------------------------------------------------------------------------

// Product 1: High‑quality earphones (mostly positive, one suspicious review)
const product1Reviews: Review[] = [
  {
    reviewerName: 'AhmedKhan',
    text: 'Sound quality is amazing, bass is deep and clear. Delivery was fast.',
    rating: 5,
    date: '2024-03-15',
  },
  {
    reviewerName: 'SaraAli',
    text: 'bohot achi product ha, main ny yeh khreedi ha. sound bohot clear ha.',
    rating: 5,
    date: '2024-03-14',
  },
  {
    reviewerName: 'TechGuy',
    text: 'Good for the price, but the cable feels a bit flimsy. Works fine though.',
    rating: 4,
    date: '2024-03-10',
  },
  {
    reviewerName: 'AhmedKhan', // Same reviewer posting a very similar review
    text: 'Sound quality is amazing, bass is deep and clear. Delivery was fast.', // identical
    rating: 5,
    date: '2024-03-16',
  },
  {
    reviewerName: 'Anonymous',
    text: 'bakwas product. waste of money. broke after 2 days.',
    rating: 1,
    date: '2024-03-12',
  },
  {
    reviewerName: 'FakeUser123',
    text: 'Good', // very short generic
    rating: 5,
    date: '2024-03-17',
  },
];

// Product 2: A phone case with mixed reviews, including rating-sentiment mismatch
const product2Reviews: Review[] = [
  {
    reviewerName: 'Zara',
    text: 'main ny yeh case khreeda, fit bohot perfect ha. achi quality.',
    rating: 5,
    date: '2024-03-18',
  },
  {
    reviewerName: 'Bilal',
    text: 'Not worth the money. Very cheap plastic, arrived scratched.',
    rating: 1,
    date: '2024-03-19',
  },
  {
    reviewerName: 'Omer123',
    text: 'This product is terrible, it broke immediately. I hate it.', // negative text but 5 stars (default star issue)
    rating: 5,
    date: '2024-03-20',
  },
  {
    reviewerName: 'Laiba',
    text: 'nice product', // short generic
    rating: 4,
    date: '2024-03-21',
  },
];

// Product 3: No reviews (edge case)
const product3Reviews: Review[] = [];

// -----------------------------------------------------------------------------
// Test runner
// -----------------------------------------------------------------------------
async function runTests() {
  console.log('🧪 REVIEW ANALYZER TEST SUITE');
  console.log('='.repeat(70));

  const analyzer = ReviewAnalyzer.getInstance();

  const testProducts = [
    { name: 'Premium Earphones', reviews: product1Reviews },
    { name: 'Phone Case', reviews: product2Reviews },
    { name: 'Empty Product (No Reviews)', reviews: product3Reviews },
  ];

  for (const product of testProducts) {
    console.log(`\n📦 PRODUCT: ${product.name}`);
    console.log(`   Total reviews: ${product.reviews.length}`);
    console.log('-'.repeat(70));

    const result = await analyzer.analyzeProductReviews(product.reviews);

    // Display per‑review analysis
    console.log('\n🔍 Per‑Review Analysis:');
    console.log(
      '   ' +
      'Reviewer'.padEnd(15) +
      'Sentiment'.padEnd(12) +
      'Score'.padEnd(8) +
      'Spam?'.padEnd(8) +
      'Language'.padEnd(10) +
      'Reason'
    );
    console.log('   ' + '-'.repeat(80));

    for (let i = 0; i < product.reviews.length; i++) {
      const review = product.reviews[i];
      const analysis = result.reviews[i];

      const reviewer = (review.reviewerName || 'Anonymous').slice(0, 14).padEnd(15);
      const sentiment = analysis.sentimentLabel.padEnd(12);
      const score = analysis.sentimentScore.toFixed(2).padEnd(8);
      const spam = analysis.isSpam ? '⚠️ YES' : '✅ NO';
      const lang = analysis.language.padEnd(10);

      let reason = '';
      if (analysis.isSpam && analysis.spamReason) {
        reason = `→ ${analysis.spamReason}`;
      } else if (!analysis.isSpam) {
        reason = `→ Valid review (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`;
      }

      console.log(`   ${reviewer}${sentiment}${score}${spam}  ${lang}${reason}`);
    }

    // Display aggregated statistics
    console.log('\n📊 Aggregated Statistics:');
    console.log(`   • Unique reviewers: ${result.uniqueReviewers}`);
    console.log(`   • Spam ratio: ${(result.spamRatio * 100).toFixed(1)}%`);
    console.log('   • Sentiment distribution:');
    console.log(`       - Positive: ${result.sentimentDistribution.positive}`);
    console.log(`       - Negative: ${result.sentimentDistribution.negative}`);
    console.log(`       - Neutral : ${result.sentimentDistribution.neutral}`);
    console.log(`   • Average sentiment score: ${result.averageSentiment.toFixed(2)} (range -1 to +1)`);
    console.log(`   • Overall product sentiment: ${getOverallSentiment(result.averageSentiment)}`);

    console.log('\n' + '='.repeat(70));
  }

  console.log('\n✅ All tests completed.');
}

function getOverallSentiment(score: number): string {
  if (score > 0.3) return '👍 Positive';
  if (score < -0.3) return '👎 Negative';
  return '😐 Neutral';
}

// -----------------------------------------------------------------------------
// Execute
// -----------------------------------------------------------------------------
runTests().catch(console.error);