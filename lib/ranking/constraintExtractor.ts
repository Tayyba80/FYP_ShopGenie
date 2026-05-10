import nlp from 'compromise';
import { pipeline, FeatureExtractionPipeline, TokenClassificationPipeline } from '@xenova/transformers';
import { distance as levenshtein } from 'fastest-levenshtein';

export interface ExtractedConstraint {
  type: 'price' | 'rating' | 'brand' | 'feature' | 'excluded_feature';
  value: any;
  confidence: number;
  sourceText?: string;
}

export interface UserConstraints {
  minPrice?: number;
  maxPrice?: number;
  currency: string;
  minRating?: number;
  brands: string[];
  desiredFeatures: string[];
  excludedFeatures: string[];
  rawQuery: string;
  constraints: ExtractedConstraint[];
}

export interface NerToken {
  word: string;
  entity: string;
  index: number;
  score: number;
}

export class ConstraintExtractor {
  private static featureEmbedder: FeatureExtractionPipeline | null = null;
  private static nerModel: TokenClassificationPipeline | null = null;
  private static initPromise: Promise<void> | null = null;
  private static cachedCanonicalEmbeddings: number[][] | null = null;
  private static canonicalFeatures: string[] = [];
  private static knownBrands = new Set<string>();

  private static readonly currencyMap: Record<string, string> = {
    $: 'USD', usd: 'USD', '€': 'EUR', eur: 'EUR', '£': 'GBP', gbp: 'GBP',
    '₹': 'INR', inr: 'INR', pkr: 'PKR', rs: 'PKR', '₨': 'PKR',
  };

  private static readonly stopwords = new Set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
    'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers',
    'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
    'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does',
    'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
    'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
    'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
    'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
    'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now',
    'want', 'need', 'looking', 'look', 'like', 'prefer', 'must', 'best', 'good', 'great',
    'budget', 'cheap', 'expensive', 'under', 'above', 'below', 'max', 'min', 'rs', 'pkr',
    'usd', 'inr', 'eur', 'gbp', 'headphones', 'headphone', 'earphones', 'earphone',
    'earbuds', 'buds', 'phone', 'tv', 'television', 'laptop', 'mouse', 'keyboard',
    'shoes', 'shoe', 'jeans', 'denim', 'heels', 'heel', 'size', 'color', 'colour',
    'price', 'cost', 'rupees', 'dollars', 'euros', 'pounds',
  ]);

  static setKnownBrands(brands: string[]) {
    ConstraintExtractor.knownBrands = new Set(brands.map(b => b.toLowerCase().trim()));
  }

  static initializeCanonicalFeatures(features: string[]) {
    ConstraintExtractor.canonicalFeatures = Array.from(new Set(features.map(f => f.toLowerCase().trim())));
    ConstraintExtractor.cachedCanonicalEmbeddings = null; // invalidate
  }

  //allow tests to inject mock pipelines
   static setPipelines(featureEmbedder: any, nerModel: any) {
    ConstraintExtractor.featureEmbedder = featureEmbedder;
    ConstraintExtractor.nerModel = nerModel;
  }

    private static async ensureModels(): Promise<void> {
    if (!ConstraintExtractor.initPromise) {
      ConstraintExtractor.initPromise = (async () => {
        if (!ConstraintExtractor.featureEmbedder) {
          ConstraintExtractor.featureEmbedder = await pipeline(
            'feature-extraction',
            'Xenova/all-mpnet-base-v2'
          );
        }
        if (!ConstraintExtractor.nerModel) {
          ConstraintExtractor.nerModel = await pipeline(
            'token-classification',
            'Xenova/bert-base-NER'
          );
        }
      })();
    }
    await ConstraintExtractor.initPromise;
  }

  private query: string;
  private doc: any;

  constructor(query: string) {
    this.query = query.toLowerCase().trim();
    this.doc = nlp(this.query);
  }

  async extract(): Promise<UserConstraints> {
    await ConstraintExtractor.ensureModels();

    const constraints: UserConstraints = {
      currency: 'USD',
      brands: [],
      desiredFeatures: [],
      excludedFeatures: [],
      rawQuery: this.query,
      constraints: [],
    };

    this.extractRating(constraints);
    this.extractPrice(constraints);
    await this.extractBrands(constraints);
    this.extractExcludedFeatures(constraints);
    await this.extractDesiredFeatures(constraints);

    constraints.desiredFeatures = [...new Set(constraints.desiredFeatures)];
    constraints.excludedFeatures = [...new Set(constraints.excludedFeatures)];
    constraints.brands = [...new Set(constraints.brands)];

    return constraints;
  }


  private extractRating(constraints: UserConstraints): void {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:\+?\s*stars?(?:\s+and\s+above)?|\s*rating)/i,
      /(?:rating|stars?)\s*(?:of\s*)?(\d+(?:\.\d+)?)/i,
      /at\s+least\s+(\d+(?:\.\d+)?)\s*stars?/i,
      /(\d+(?:\.\d+)?)\s*\+\s*stars?/i,
    ];

    for (const regex of patterns) {
      const match = this.query.match(regex);
      if (match) {
        const rating = parseFloat(match[1]);
        if (rating >= 0 && rating <= 5) {
          constraints.minRating = rating;
          constraints.constraints.push({
            type: 'rating',
            value: rating,
            confidence: 0.9,
            sourceText: match[0],
          });
          break;
        }
      }
    }
  }

  private extractPrice(constraints: UserConstraints): void {
    // Replace k-notation throughout
    const kNotationRe = /(\d+(?:\.\d+)?)\s*k\b/gi;
    let processedQuery = this.query.replace(kNotationRe, (_, num) => (parseFloat(num) * 1000).toString());

    // Detect currency
    for (const [symbol, curr] of Object.entries(ConstraintExtractor.currencyMap)) {
      if (processedQuery.includes(symbol.toLowerCase())) {
        constraints.currency = curr;
        break;
      }
    }

    const normalizedQuery = processedQuery.replace(/(\d),(?=\d{3})/g, '$1');
    const cleanNumber = (s: string) => parseFloat(s);

    // 1. Negated maximums
    const noMoreThanRegex = /\b(?:no|not)\s+more\s+than\s+(?:rs\.?|pkr|usd|\$|€|£|₹)?\s*(\d+(?:\.\d+)?)/i;
    let match = normalizedQuery.match(noMoreThanRegex);
    if (match) {
      constraints.maxPrice = cleanNumber(match[1]);
      constraints.constraints.push({
        type: 'price',
        value: { max: constraints.maxPrice },
        confidence: 0.95,
        sourceText: match[0],
      });
      return;
    }

    // 2. Standard patterns (avoid rating numbers)
    const rangePattern = /(?:between\s+)?(?:rs\.?|pkr|usd|\$|€|£|₹)?\s*(\d+(?:\.\d+)?)\s*(?:-|–|to|and)\s*(?:rs\.?|pkr|usd|\$|€|£|₹)?\s*(\d+(?:\.\d+)?)(?!\s*star|\s*rating)/i;
    const maxPattern = /(?:under|less\s+than|below|max|upto|up\s+to|at\s+most)\s+(?:rs\.?|pkr|usd|\$|€|£|₹)?\s*(\d+(?:\.\d+)?)(?!\s*star|\s*rating)/i;
    const minPattern = /(?:above|more\s+than|min|at\s+least|over)\s+(?:rs\.?|pkr|usd|\$|€|£|₹)?\s*(\d+(?:\.\d+)?)(?!\s*star|\s*rating)/i;

    match = normalizedQuery.match(rangePattern);
    if (match) {
      constraints.minPrice = cleanNumber(match[1]);
      constraints.maxPrice = cleanNumber(match[2]);
      constraints.constraints.push({
        type: 'price',
        value: { min: constraints.minPrice, max: constraints.maxPrice },
        confidence: 0.95,
        sourceText: match[0],
      });
      return;
    }

    match = normalizedQuery.match(maxPattern);
    if (match) {
      constraints.maxPrice = cleanNumber(match[1]);
      constraints.constraints.push({
        type: 'price',
        value: { max: constraints.maxPrice },
        confidence: 0.9,
        sourceText: match[0],
      });
    }

    match = normalizedQuery.match(minPattern);
    if (match) {
      const val = cleanNumber(match[1]);
      if (val > 5 || !this.query.includes('star')) {
        constraints.minPrice = val;
        constraints.constraints.push({
          type: 'price',
          value: { min: val },
          confidence: 0.85,
          sourceText: match[0],
        });
      }
    }

    // Fallback: single price mention
    if (constraints.minPrice === undefined && constraints.maxPrice === undefined) {
      const singleRegex = /(?:rs\.?|pkr|usd|\$|€|£|₹)\s*(\d+(?:\.\d+)?)(?!\s*star|\s*rating)/gi;
      const matches = [...normalizedQuery.matchAll(singleRegex)];
      if (matches.length === 1) {
        const val = cleanNumber(matches[0][1]);
        constraints.maxPrice = val;
        constraints.constraints.push({
          type: 'price',
          value: { max: val },
          confidence: 0.6,
          sourceText: matches[0][0],
        });
      }
    }
  }

  private async extractBrands(constraints: UserConstraints): Promise<void> {
    const words = this.query.split(/\s+/);
    for (const word of words) {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanWord.length > 2 && ConstraintExtractor.knownBrands.has(cleanWord)) {
        constraints.brands.push(cleanWord);
        constraints.constraints.push({
          type: 'brand',
          value: cleanWord,
          confidence: 1.0,
          sourceText: word,
        });
      }
    }

    if (constraints.brands.length > 0) return;

    try {
      const rawNer = await ConstraintExtractor.nerModel!(this.query);
      const nerArray = Array.isArray(rawNer) ? rawNer : [rawNer];
      const entities = nerArray.map((item: any) => ({
        word: item.word,
        entity: item.entity,
        index: item.index,
      }));

      const brands: string[] = [];
      let currentBrand = '';

      for (let i = 0; i < entities.length; i++) {
        const item = entities[i];
        if (item.entity === 'B-ORG' || item.entity === 'B-MISC') {
          currentBrand = item.word;
          let j = i + 1;
          while (j < entities.length && entities[j].entity === 'I-ORG') {
            currentBrand += ' ' + entities[j].word;
            j++;
          }
          brands.push(currentBrand.toLowerCase());
          i = j - 1;
        }
      }

      const properNouns = this.doc.match('#ProperNoun').out('array');
      const allCandidates = [...new Set([...brands, ...properNouns])];

      for (const candidate of allCandidates) {
        const lower = candidate.toLowerCase();
        if (lower.length > 2 && !ConstraintExtractor.stopwords.has(lower)) {
          constraints.brands.push(lower);
          constraints.constraints.push({
            type: 'brand',
            value: lower,
            confidence: 0.85,
            sourceText: candidate,
          });
        }
      }
    } catch (error) {
      console.warn('NER error, falling back to proper nouns:', error);
      const properNouns = this.doc.match('#ProperNoun').out('array');
      for (const noun of properNouns) {
        const lower = noun.toLowerCase();
        if (lower.length > 2 && !ConstraintExtractor.stopwords.has(lower)) {
          constraints.brands.push(lower);
          constraints.constraints.push({
            type: 'brand',
            value: lower,
            confidence: 0.7,
            sourceText: noun,
          });
        }
      }
    }
  }

  private extractExcludedFeatures(constraints: UserConstraints): void {
    const negationPatterns = [
      /\bno\s+([a-z0-9\s]+?)(?=\s*(?:,|\.|$|\band\b|\bor\b|\bbut\b|please|thanks))/g,
      /\bwithout\s+([a-z0-9\s]+?)(?=\s*(?:,|\.|$|\band\b|\bor\b|\bbut\b|please|thanks))/g,
      /\bnot\s+([a-z0-9\s]+?)(?=\s*(?:,|\.|$|\band\b|\bor\b|\bbut\b|please|thanks))/g,
      /\bexcept\s+([a-z0-9\s]+?)(?=\s*(?:,|\.|$|\band\b|\bor\b|\bbut\b|please|thanks))/g,
      /\bavoid\s+([a-z0-9\s]+?)(?=\s*(?:,|\.|$|\band\b|\bor\b|\bbut\b|please|thanks))/g,
      /\bdont\s+want\s+([a-z0-9\s]+?)(?=\s*(?:,|\.|$|\band\b|\bor\b|\bbut\b|please|thanks))/g,
      /\bdo\s+not\s+want\s+([a-z0-9\s]+?)(?=\s*(?:,|\.|$|\band\b|\bor\b|\bbut\b|please|thanks))/g,
      /\bbut\s+not\s+([a-z0-9\s]+?)(?=\s*(?:,|\.|$|\band\b|\bor\b|please|thanks))/g,
    ];

    for (const pattern of negationPatterns) {
      let match;
      while ((match = pattern.exec(this.query)) !== null) {
        let phrase = match[1].trim().replace(/[,.!?;]$/, '');
        if (/\d/.test(phrase) && /pkr|rs|usd|\$|€|£|₹|price|cost|rupees|dollars/i.test(phrase)) continue;
        if (phrase.length > 1 && !ConstraintExtractor.stopwords.has(phrase)) {
          constraints.excludedFeatures.push(phrase);
          constraints.constraints.push({
            type: 'excluded_feature',
            value: phrase,
            confidence: 0.9,
            sourceText: match[0],
          });
        }
      }
    }
  }

  private async extractDesiredFeatures(constraints: UserConstraints): Promise<void> {
    if (ConstraintExtractor.canonicalFeatures.length === 0) {
      this.fallbackKeywordFeatures(constraints);
      return;
    }

    const nouns = this.doc.nouns().out('array') as string[];
    const adjNoun = this.doc.match('#Adjective #Noun').out('array') as string[];
    const properNouns = this.doc.match('#ProperNoun').out('array') as string[];

    let rawPhrases = [...nouns, ...adjNoun, ...properNouns]
      .map(p => p.toLowerCase().trim())
      .filter(p => p.length > 1 && !this.isStopwordOrNoise(p));

    const splitPhrases: string[] = [];
    for (const phrase of rawPhrases) {
      if (/\band\b|\bor\b|\/|,/.test(phrase)) {
        phrase.split(/\band\b|\bor\b|\/|,/).forEach(part => {
          const cleaned = part.trim();
          if (cleaned.length > 1 && !this.isStopwordOrNoise(cleaned)) splitPhrases.push(cleaned);
        });
      } else {
        splitPhrases.push(phrase);
      }
    }

    const brandSet = new Set(constraints.brands);
    const excludedSet = new Set(constraints.excludedFeatures);
    const phrases = [...new Set(splitPhrases)].filter(p => !brandSet.has(p) && !excludedSet.has(p));

    if (phrases.length === 0) return;

    // --- Fix: compute or reuse canonical embeddings ---
    if (!ConstraintExtractor.cachedCanonicalEmbeddings) {
      const canonicalTexts = ConstraintExtractor.canonicalFeatures;
      const embTensor = await ConstraintExtractor.featureEmbedder!(canonicalTexts, {
        pooling: 'mean',
        normalize: true,
      });
      ConstraintExtractor.cachedCanonicalEmbeddings = embTensor.tolist?.() ?? Array.from(embTensor.data);
    }

    // --- Fix: compute phrase embeddings ---
    const phraseEmbTensor = await ConstraintExtractor.featureEmbedder!(phrases, {
      pooling: 'mean',
      normalize: true,
    });
    const phraseEmbs = phraseEmbTensor.tolist?.() ?? Array.from(phraseEmbTensor.data);
    const canonicalEmbs = ConstraintExtractor.cachedCanonicalEmbeddings!;

    const SIMILARITY_THRESHOLD = 0.55;

    for (let i = 0; i < phrases.length; i++) {
      const phraseEmb = phraseEmbs[i];
      let bestScore = -1;
      let bestFeature = '';

      for (let j = 0; j < ConstraintExtractor.canonicalFeatures.length; j++) {
        const score = this.cosineSimilarity(phraseEmb, canonicalEmbs[j]);
        if (score > bestScore) {
          bestScore = score;
          bestFeature = ConstraintExtractor.canonicalFeatures[j];
        }
      }

      if (bestScore >= SIMILARITY_THRESHOLD) {
        constraints.desiredFeatures.push(bestFeature);
        constraints.constraints.push({
          type: 'feature',
          value: bestFeature,
          confidence: bestScore,
          sourceText: phrases[i],
        });
      } else {
        const fuzzyMatch = this.fuzzyMatch(phrases[i]);
        if (fuzzyMatch) {
          constraints.desiredFeatures.push(fuzzyMatch);
          constraints.constraints.push({
            type: 'feature',
            value: fuzzyMatch,
            confidence: 0.65,
            sourceText: phrases[i],
          });
        } else {
          constraints.desiredFeatures.push(phrases[i]);
          constraints.constraints.push({
            type: 'feature',
            value: phrases[i],
            confidence: 0.5,
            sourceText: phrases[i],
          });
        }
      }
    }
  }

  private isStopwordOrNoise(word: string): boolean {
    if (ConstraintExtractor.stopwords.has(word)) return true;
    if (/^\d+(?:\.\d+)?$/.test(word)) return true;
    if (/^[$€£₹]/.test(word)) return true;
    return false;
  }

  private fallbackKeywordFeatures(constraints: UserConstraints): void {
    const nouns = this.doc.nouns().out('array');
    const adjectives = this.doc.adjectives().out('array');
    const candidates = [...new Set([...nouns, ...adjectives])]
      .map(w => w.toLowerCase())
      .filter(w => !this.isStopwordOrNoise(w) && w.length > 2);

    for (const c of candidates) {
      constraints.desiredFeatures.push(c);
      constraints.constraints.push({ type: 'feature', value: c, confidence: 0.4, sourceText: c });
    }
  }

  private fuzzyMatch(phrase: string): string | null {
    let bestMatch: string | null = null;
    let bestDist = Infinity;
    const maxDist = Math.floor(phrase.length * 0.3);
    for (const feat of ConstraintExtractor.canonicalFeatures) {
      const dist = levenshtein(phrase, feat);
      if (dist < bestDist && dist <= maxDist) {
        bestDist = dist;
        bestMatch = feat;
      }
    }
    return bestMatch;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const mag = Math.sqrt(magA) * Math.sqrt(magB);
    return mag === 0 ? 0 : dot / mag;
  }
}