import { Review } from '../../types/product';
import { 
  pipeline, 
  env, 
  TextClassificationPipeline, 
  FeatureExtractionPipeline 
} from '@xenova/transformers';
import { franc } from 'franc-min';

// ============================================================================
// CONFIGURATION
// ============================================================================
env.localModelPath = './models';
env.allowRemoteModels = true;   // ✅ Fixed typo

// ============================================================================
// ROMAN URDU → URDU SCRIPT TRANSLITERATION
// ============================================================================
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
// ============================================================================
// INTERFACES
// ============================================================================
export interface ReviewAnalysis {
  sentimentScore: number;        // -1 to +1
  sentimentLabel: 'positive' | 'negative' | 'neutral';
  confidence: number;
  isSpam: boolean;
  spamReason?: string;
  language: string;              // ISO 639-3 code
}

export interface ProductReviewAnalysis {
  reviews: ReviewAnalysis[];
  spamRatio: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  averageSentiment: number;
  uniqueReviewers: number;
}

// ============================================================================
// SINGLETON ANALYZER
// ============================================================================
export class ReviewAnalyzer {
  private static instance: ReviewAnalyzer;
  private sentimentPipeline: TextClassificationPipeline | null = null;
  private embeddingPipeline: FeatureExtractionPipeline | null = null;
  private initPromise: Promise<void> | null = null;
   private analysisCache = new Map<string, { analysis: ProductReviewAnalysis; timestamp: number }>();
  private readonly CACHE_TTL_MS = 30 * 60 * 1000;

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
      
      this.sentimentPipeline = await pipeline(
        'sentiment-analysis',
        'Xenova/bert-base-multilingual-uncased-sentiment'
      ) as TextClassificationPipeline;

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

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================
    async analyzeProductReviews(reviews: Review[], productId?: string): Promise<ProductReviewAnalysis> {
    await this.ensureInitialized();

    // ⭐ CACHE CHECK: If we have a productId and a fresh cache entry, return it
    if (productId && this.analysisCache.has(productId)) {
      const cached = this.analysisCache.get(productId)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        console.log(`✅ Using cached review analysis for product ${productId}`);
        return cached.analysis;
      }
    }

    if (!reviews.length) {
      const emptyResult = {
        reviews: [],
        spamRatio: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0 },
        averageSentiment: 0,
        uniqueReviewers: 0,
      };
      if (productId) {
        this.analysisCache.set(productId, { analysis: emptyResult, timestamp: Date.now() });
      }
      return emptyResult;
    }

    // --- Existing analysis logic (unchanged) ---
    // Preprocess: language detection & Roman Urdu check
    const preprocessed = reviews.map(r => ({
      review: r,
      lang: franc(r.text, { minLength: 3 }),
      isRomanUrdu: isLikelyRomanUrdu(r.text),
    }));

    // Batch sentiment analysis
    const sentimentResults = await this.batchSentimentAnalysis(
      preprocessed.map(p => p.isRomanUrdu ? transliterateRomanUrdu(p.review.text) : p.review.text)
    );

    // Build initial analysis objects
    const analyses: ReviewAnalysis[] = preprocessed.map((p, idx) => {
      const result = sentimentResults[idx];
      const starRating = parseInt(result.label.split(' ')[0]); // "5 stars" → 5
      let sentimentScore: number;
      let sentimentLabel: 'positive' | 'negative' | 'neutral';

      if (starRating >= 4) {
        sentimentLabel = 'positive';
        sentimentScore = (starRating - 3) / 2;
      } else if (starRating <= 2) {
        sentimentLabel = 'negative';
        sentimentScore = (starRating - 3) / 2;
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

    // Spam detection (embeddings for same-reviewer similarity)
    await this.batchSpamDetection(reviews, analyses, preprocessed);

    // Aggregate statistics
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

    const result: ProductReviewAnalysis = {
      reviews: analyses,
      spamRatio,
      sentimentDistribution: distribution,
      averageSentiment,
      uniqueReviewers,
    };

    // ⭐ STORE IN CACHE before returning
    if (productId) {
      this.analysisCache.set(productId, { analysis: result, timestamp: Date.now() });
    }

    return result;
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================
  private async batchSentimentAnalysis(texts: string[]): Promise<any[]> {
    const results: any[] = [];
    const chunkSize = 32;
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
    // 1. Fast heuristic checks
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      const analysis = analyses[i];

      // Rating-sentiment mismatch
      // if (review.rating >= 4 && analysis.sentimentLabel === 'negative') {
      //   analysis.isSpam = true;
      //   analysis.spamReason = 'Rating-sentiment mismatch (high rating, negative text)';
      //   continue;
      // }

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

      // Suspicious reviewer name pattern
      if (review.reviewerName && /^[A-Z]\d+$/.test(review.reviewerName)) {
        analysis.isSpam = true;
        analysis.spamReason = 'Suspicious reviewer name pattern';
        continue;
      }
    }

    // 2. Semantic similarity for same-reviewer groups
    const reviewerGroups: Record<string, number[]> = {};
    for (let i = 0; i < reviews.length; i++) {
      if (analyses[i].isSpam) continue;
      const name = reviews[i].reviewerName?.toLowerCase().trim();
      if (!name) continue;
      if (!reviewerGroups[name]) reviewerGroups[name] = [];
      reviewerGroups[name].push(i);
    }

    for (const indices of Object.values(reviewerGroups)) {
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