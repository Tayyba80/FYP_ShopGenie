// // lib/ranking/reviewAnalyzer.ts

// import { Review } from '@/types/product';
// import Sentiment from 'sentiment'; // npm install sentiment

// interface ReviewAnalysis {
//   sentimentScore: number;        // -5 to +5
//   sentimentLabel: 'positive' | 'negative' | 'neutral';
//   isSpam: boolean;
//   spamReason?: string;
// }

// export interface ProductReviewAnalysis {
//   reviews: ReviewAnalysis[];
//   spamRatio: number;
//   sentimentDistribution: {
//     positive: number;
//     negative: number;
//     neutral: number;
//   };
//   averageSentiment: number;
//   uniqueReviewers: number;
// }

// export class ReviewAnalyzer {
//   private sentimentAnalyzer: Sentiment;

//   constructor() {
//     this.sentimentAnalyzer = new Sentiment();
//   }

//   analyzeProductReviews(reviews: Review[]): ProductReviewAnalysis {
//     const analyzedReviews: ReviewAnalysis[] = reviews.map(r => this.analyzeSingleReview(r, reviews));
    
//     const spamCount = analyzedReviews.filter(r => r.isSpam).length;
//     const spamRatio = reviews.length > 0 ? spamCount / reviews.length : 0;
    
//     const distribution = {
//       positive: analyzedReviews.filter(r => r.sentimentLabel === 'positive' && !r.isSpam).length,
//       negative: analyzedReviews.filter(r => r.sentimentLabel === 'negative' && !r.isSpam).length,
//       neutral: analyzedReviews.filter(r => r.sentimentLabel === 'neutral' && !r.isSpam).length,
//     };

//     const validReviews = analyzedReviews.filter(r => !r.isSpam);
//     const averageSentiment = validReviews.length > 0
//       ? validReviews.reduce((sum, r) => sum + r.sentimentScore, 0) / validReviews.length
//       : 0;

//     const uniqueReviewers = new Set(reviews.map(r => r.reviewerName?.toLowerCase().trim()).filter(Boolean)).size;

//     return {
//       reviews: analyzedReviews,
//       spamRatio,
//       sentimentDistribution: distribution,
//       averageSentiment,
//       uniqueReviewers,
//     };
//   }

//   private analyzeSingleReview(review: Review, allReviews: Review[]): ReviewAnalysis {
//     const sentimentResult = this.sentimentAnalyzer.analyze(review.text);
//     const score = sentimentResult.score;
    
//     let label: 'positive' | 'negative' | 'neutral' = 'neutral';
//     if (score > 0) label = 'positive';
//     else if (score < 0) label = 'negative';

//     // Spam detection heuristics
//     let isSpam = false;
//     let spamReason = '';

//     // 1. Rating-sentiment mismatch (strong negative text but 5 stars)
//     if (review.rating >= 4 && score < -2) {
//       isSpam = true;
//       spamReason = 'Rating-sentiment mismatch (high rating, negative text)';
//     }

//     // 2. Very short generic review
//     if (review.text.length < 10 && /^(good|nice|great|ok|bad|poor)$/i.test(review.text.trim())) {
//       isSpam = true;
//       spamReason = 'Too short and generic';
//     }

//     // 3. Duplicate reviewer names with similar text
//     const sameReviewerReviews = allReviews.filter(r => 
//       r.reviewerName?.toLowerCase().trim() === review.reviewerName?.toLowerCase().trim()
//     );
//     if (sameReviewerReviews.length > 2) {
//       const similarCount = sameReviewerReviews.filter(r => 
//         this.textSimilarity(r.text, review.text) > 0.8
//       ).length;
//       if (similarCount > 1) {
//         isSpam = true;
//         spamReason = 'Multiple similar reviews from same reviewer';
//       }
//     }

//     // 4. Review text identical to another
//     const identicalCount = allReviews.filter(r => r.text === review.text).length;
//     if (identicalCount > 1) {
//       isSpam = true;
//       spamReason = 'Identical review text appears multiple times';
//     }

//     return { sentimentScore: score, sentimentLabel: label, isSpam, spamReason };
//   }

//   private textSimilarity(text1: string, text2: string): number {
//     // Simple Jaccard similarity on words
//     const words1 = new Set(text1.toLowerCase().split(/\W+/));
//     const words2 = new Set(text2.toLowerCase().split(/\W+/));
//     const intersection = new Set([...words1].filter(w => words2.has(w)));
//     const union = new Set([...words1, ...words2]);
//     return intersection.size / union.size;
//   }
// }
// lib/ranking/reviewAnalyzer.ts

// lib/ranking/reviewAnalyzer.ts

import { Review } from '@/types/product';
import { pipeline, env, Pipeline, FeatureExtractionPipeline } from '@xenova/transformers';
import { franc } from 'franc-min';

// Configuration
env.localModelPath = './models';
env.allowRemoteMessages = true;

// --- TRANSLITERATION & PREPROCESSING ---
// Expanded mapping for common Roman Urdu words. This helps the multilingual model understand.
const romanUrduToUrdu: Record<string, string> = {
  'main': 'میں', 'ny': 'نے', 'yeh': 'یہ', 'ha': 'ہے', 'hai': 'ہے',
  'bohot': 'بہت', 'bohat': 'بہت', 'acha': 'اچھا', 'achi': 'اچھی',
  'kharab': 'خراب', 'bakwas': 'بکواس', 'behtareen': 'بہترین',
  'zabardast': 'زبردست', 'kamal': 'کمال', 'shandar': 'شاندار',
  'khreeda': 'خریدا', 'khreedi': 'خریدی', 'khareed': 'خرید',
  'product': 'پروڈکٹ', 'delivery': 'ڈیلیوری', 'packing': 'پیکنگ',
  'quality': 'کوالٹی', 'price': 'قیمت', 'paisa': 'پیسہ',
  'waste': 'ویسٹ', 'time': 'ٹائم', 'order': 'آرڈر',
  'received': 'موصول', 'working': 'کام', 'fine': 'ٹھیک',
  'sahi': 'صحیح', 'galat': 'غلط', 'asli': 'اصلی', 'naqli': 'نقلی',
  'recommend': 'تجویز', 'buy': 'خریدنا', 'love': 'محبت', 'hate': 'نفرت',
};

function transliterateRomanUrdu(text: string): string {
  // Replace known words with their Urdu script equivalents
  return text.replace(/[\w\u0600-\u06FF]+/g, (word) => {
    const lower = word.toLowerCase();
    return romanUrduToUrdu[lower] || word;
  });
}

function isLikelyRomanUrdu(text: string): boolean {
  const lowerText = text.toLowerCase();
  const markers = Object.keys(romanUrduToUrdu);
  let count = 0;
  for (const marker of markers) {
    if (lowerText.includes(marker)) count++;
    if (count >= 2) return true;
  }
  return false;
}
// --- END OF TRANSLITERATION ---

export interface ReviewAnalysis { /* ... same as before ... */ }
export interface ProductReviewAnalysis { /* ... same as before ... */ }

export class ReviewAnalyzer {
  private static instance: ReviewAnalyzer;
  private sentimentPipeline: Pipeline | null = null;
  private embeddingPipeline: FeatureExtractionPipeline | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): ReviewAnalyzer {
    if (!ReviewAnalyzer.instance) {
      ReviewAnalyzer.instance = new ReviewAnalyzer();
    }
    return ReviewAnalyzer.instance;
  }

  private async initializeModels(): Promise<void> {
    try {
      console.log('🔄 Loading sentiment & embedding models...');
      
      // Load the correct ONNX model
      this.sentimentPipeline = await pipeline(
        'sentiment-analysis',
        'Xenova/bert-base-multilingual-uncased-sentiment' // Updated model name
      );

      this.embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/multilingual-e5-small'
      ) as FeatureExtractionPipeline;

      console.log('✅ ReviewAnalyzer models loaded.');
    } catch (error) {
      console.error('❌ Failed to load models:', error);
      throw new Error('Model initialization failed');
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.sentimentPipeline && this.embeddingPipeline) return;
    if (!this.initPromise) {
      this.initPromise = this.initializeModels();
    }
    await this.initPromise;
  }

  async analyzeProductReviews(reviews: Review[]): Promise<ProductReviewAnalysis> {
    await this.ensureInitialized();

    if (!reviews.length) {
      return {
        reviews: [],
        spamRatio: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
        averageSentiment: 0,
        uniqueReviewers: 0,
      };
    }

    // 1. Preprocess reviews: Detect language and handle Roman Urdu
    const preprocessed = reviews.map(r => ({
      review: r,
      lang: franc(r.text, { minLength: 3 }),
      isRomanUrdu: isLikelyRomanUrdu(r.text),
    }));

    // 2. Batch Sentiment Analysis
    const sentimentResults = await this.batchSentimentAnalysis(
      preprocessed.map(p => p.isRomanUrdu ? transliterateRomanUrdu(p.review.text) : p.review.text)
    );

    // 3. Build initial analysis objects
    const analyses: ReviewAnalysis[] = preprocessed.map((p, idx) => {
      const result = sentimentResults[idx];
      // Model returns label like '1 star', '2 stars', etc.
      const starRating = parseInt(result.label.split(' ')[0]); // 1-5
      let sentimentScore: number;
      let sentimentLabel: 'positive' | 'negative' | 'neutral';

      if (starRating >= 4) {
        sentimentLabel = 'positive';
        sentimentScore = (starRating - 3) / 2; // 4→0.5, 5→1.0
      } else if (starRating <= 2) {
        sentimentLabel = 'negative';
        sentimentScore = (starRating - 3) / 2; // 1→-1.0, 2→-0.5
      } else {
        sentimentLabel = 'neutral';
        sentimentScore = 0;
      }

      return {
        sentimentScore,
        sentimentLabel,
        confidence: result.score,
        isSpam: false,
        language: p.isRomanUrdu ? 'ur' : p.lang,
      };
    });

    // 4. Spam Detection (using embeddings)
    await this.batchSpamDetection(reviews, analyses, preprocessed);

    // 5. Aggregate Statistics
    const spamCount = analyses.filter(a => a.isSpam).length;
    const spamRatio = spamCount / reviews.length;
    
    const validAnalyses = analyses.filter(a => !a.isSpam);
    const distribution = {
      positive: validAnalyses.filter(a => a.sentimentLabel === 'positive').length,
      negative: validAnalyses.filter(a => a.sentimentLabel === 'negative').length,
      neutral: validAnalyses.filter(a => a.sentimentLabel === 'neutral').length,
    };
    
    const averageSentiment = validAnalyses.length > 0
      ? validAnalyses.reduce((sum, a) => sum + a.sentimentScore, 0) / validAnalyses.length
      : 0;
    
    const uniqueReviewers = new Set(
      reviews.map(r => r.reviewerName?.toLowerCase().trim()).filter(Boolean)
    ).size;

    return {
      reviews: analyses,
      spamRatio,
      sentimentDistribution: distribution,
      averageSentiment,
      uniqueReviewers,
    };
  }

  private async batchSentimentAnalysis(texts: string[]): Promise<any[]> {
    const results: any[] = [];
    const chunkSize = 32; // Process in chunks to manage memory
    for (let i = 0; i < texts.length; i += chunkSize) {
      const chunk = texts.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(text => this.sentimentPipeline!(text))
      );
      results.push(...chunkResults.map(r => r[0]));
    }
    return results;
  }

  private async batchSpamDetection(
    reviews: Review[],
    analyses: ReviewAnalysis[],
    preprocessed: any[]
  ): Promise<void> {
    // ... (This method remains largely the same as previously provided) ...
    // 1. Fast heuristic checks
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      const analysis = analyses[i];

      // Rating-sentiment mismatch (high rating, negative text)
      if (review.rating >= 4 && analysis.sentimentLabel === 'negative') {
        analysis.isSpam = true;
        analysis.spamReason = 'Rating-sentiment mismatch (high rating, negative text)';
        continue;
      }

      // Very short generic review
      if (review.text.length < 15 && /^(good|nice|great|ok|bad|poor|achi|kharab|bakwas)$/i.test(review.text.trim())) {
        analysis.isSpam = true;
        analysis.spamReason = 'Too short and generic';
        continue;
      }

      // Identical text
      const identicalCount = reviews.filter(r => r.text === review.text).length;
      if (identicalCount > 1) {
        analysis.isSpam = true;
        analysis.spamReason = 'Identical review text appears multiple times';
        continue;
      }

      // Suspicious reviewer name pattern (e.g., "A123")
      if (review.reviewerName && /^[A-Z]\d+$/.test(review.reviewerName)) {
        analysis.isSpam = true;
        analysis.spamReason = 'Suspicious reviewer name pattern';
        continue;
      }
    }

    // 2. Semantic similarity for same-reviewer reviews (only for those not yet flagged)
    const reviewerGroups: Record<string, number[]> = {};
    for (let i = 0; i < reviews.length; i++) {
      if (analyses[i].isSpam) continue;
      const name = reviews[i].reviewerName?.toLowerCase().trim();
      if (!name) continue;
      if (!reviewerGroups[name]) reviewerGroups[name] = [];
      reviewerGroups[name].push(i);
    }

    for (const [name, indices] of Object.entries(reviewerGroups)) {
      if (indices.length < 2) continue;

      const groupTexts = indices.map(i => reviews[i].text);
      const embeddings = await this.getBatchEmbeddings(groupTexts);

      for (let i = 0; i < indices.length; i++) {
        const idxA = indices[i];
        if (analyses[idxA].isSpam) continue;
        for (let j = i + 1; j < indices.length; j++) {
          const idxB = indices[j];
          const similarity = this.cosineSimilarity(embeddings[i], embeddings[j]);
          if (similarity > 0.85) {
            analyses[idxA].isSpam = true;
            analyses[idxA].spamReason = `Semantically similar (${(similarity*100).toFixed(1)}%) to another review by same reviewer`;
            analyses[idxB].isSpam = true;
            analyses[idxB].spamReason = `Semantically similar (${(similarity*100).toFixed(1)}%) to another review by same reviewer`;
          }
        }
      }
    }
  }

  private async getBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (const text of texts) {
      const output = await this.embeddingPipeline!(text, {
        pooling: 'mean',
        normalize: true,
      });
      embeddings.push(Array.from(output.data));
    }
    return embeddings;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}