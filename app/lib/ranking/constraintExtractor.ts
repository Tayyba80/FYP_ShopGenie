// // lib/ranking/constraintExtractor.ts

// export interface UserConstraints {
//   minPrice?: number;
//   maxPrice?: number;
//   desiredFeatures: string[];
//   rawQuery: string;
// }

// export class ConstraintExtractor {
//   private query: string;

//   constructor(query: string) {
//     this.query = query.toLowerCase();
//   }

//   extract(): UserConstraints {
//     const constraints: UserConstraints = {
//       desiredFeatures: [],
//       rawQuery: this.query,
//     };

//     // Extract price range
//     const pricePatterns = [
//       /(?:rs\.?\s*|pkr\s*|price\s*(?:between|from)?\s*)(\d+)\s*(?:to|-)\s*(\d+)/i,
//       /(\d+)\s*(?:to|-)\s*(\d+)\s*(?:rs|pkr|rupees)/i,
//       /under\s*(\d+)\s*(?:rs|pkr|rupees)/i,
//       /above\s*(\d+)\s*(?:rs|pkr|rupees)/i,
//     ];

//     for (const pattern of pricePatterns) {
//       const match = this.query.match(pattern);
//       if (match) {
//         if (match[1] && match[2]) {
//           constraints.minPrice = parseInt(match[1], 10);
//           constraints.maxPrice = parseInt(match[2], 10);
//         } else if (match[1] && pattern.source.includes('under')) {
//           constraints.maxPrice = parseInt(match[1], 10);
//         } else if (match[1] && pattern.source.includes('above')) {
//           constraints.minPrice = parseInt(match[1], 10);
//         }
//         break;
//       }
//     }

//     // Extract desired features (simple keyword extraction)
//     const featureKeywords = [
//       'battery', 'sound quality', 'noise cancel', 'wireless', 'bluetooth',
//       'waterproof', 'durable', 'comfort', 'bass', 'mic', 'microphone',
//       'gaming', 'lightweight', 'fast charging', 'long lasting'
//     ];

//     const words = this.query.split(/\s+/);
//     featureKeywords.forEach(feature => {
//       if (this.query.includes(feature)) {
//         constraints.desiredFeatures.push(feature);
//       }
//     });

//     // Remove duplicates
//     constraints.desiredFeatures = [...new Set(constraints.desiredFeatures)];

//     return constraints;
//   }
// }

// lib/ranking/constraintExtractor.ts
import nlp from 'compromise';
// import compromiseDependencies from 'compromise-dependencies';
import { pipeline, env } from '@xenova/transformers';
import { distance as levenshtein } from 'fastest-levenshtein';

// Add dependency parsing plugin
// nlp.extend(compromiseDependencies);

export interface ExtractedConstraint {
  type: 'price' | 'rating' | 'brand' | 'feature' | 'excluded_feature' | 'color' | 'connectivity';
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
  colors: string[];
  connectivity: string[]; // e.g., "bluetooth", "wired"
  rawQuery: string;
  constraints: ExtractedConstraint[]; // all extracted with confidence
}

export class ConstraintExtractor {
  private query: string;
  private doc: any;
  private static featureEmbedder: any = null;
  private static cachedCanonicalEmbeddings: number[][] | null = null;
  
  // Dynamic canonical features (should be built from product catalog)
  private static canonicalFeatures: string[] = [];
  
  // Common colors and connectivity terms
  private static readonly colors = new Set([
    'black', 'white', 'red', 'blue', 'green', 'silver', 'gold', 'pink', 'purple', 'grey', 'gray'
  ]);
  private static readonly connectivity = new Set(['bluetooth', 'wired', 'wireless', 'usb-c', '3.5mm']);
  private static readonly knownBrands = new Set([
    'sony', 'bose', 'sennheiser', 'apple', 'samsung', 'jbl', 'anker', 'beats',
    'skullcandy', 'philips', 'audio technica', 'logitech', 'razer', 'corsair'
  ]);

  constructor(query: string) {
    this.query = query.toLowerCase().trim();
    this.doc = nlp(this.query);
  }

  static initializeCanonicalFeatures(productSpecs: Set<string>) {
    // Build from all product specification keys across the catalog
    ConstraintExtractor.canonicalFeatures = Array.from(productSpecs);
  }

  async extract(): Promise<UserConstraints> {
    if (!ConstraintExtractor.featureEmbedder) {
      // Use a better model for production (larger, more accurate)
      ConstraintExtractor.featureEmbedder = await pipeline(
        'feature-extraction',
        'Xenova/all-mpnet-base-v2'  // Better than MiniLM
      );
    }

    const constraints: UserConstraints = {
      currency: 'PKR',
      brands: [],
      desiredFeatures: [],
      excludedFeatures: [],
      colors: [],
      connectivity: [],
      rawQuery: this.query,
      constraints: [],
    };

    // 1. Robust price extraction
    this.extractPrice(constraints);
    
    // 2. Rating extraction
    this.extractRating(constraints);
    
    // 3. Brand extraction (improved)
    this.extractBrands(constraints);
    
    // 4. Color and connectivity extraction (simple keyword)
    this.extractSimpleAttributes(constraints);
    
    // 5. Semantic feature extraction with dynamic ontology + fuzzy fallback
    await this.extractFeaturesSemantic(constraints);
    
    // 6. Dependency‑aware negation
    this.extractExcludedFeatures(constraints);
    
    // Deduplicate
    constraints.desiredFeatures = [...new Set(constraints.desiredFeatures)];
    constraints.excludedFeatures = [...new Set(constraints.excludedFeatures)];
    constraints.brands = [...new Set(constraints.brands)];
    
    return constraints;
  }

  private extractPrice(constraints: UserConstraints): void {
    // Robust price regex with currency detection
    const priceRegex = /(?:rs\.?|pkr|usd|\$|€|£|₹)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(?:-|–|to)\s*(?:rs\.?|pkr|usd|\$|€|£|₹)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i;
    const singlePriceRegex = /(?:rs\.?|pkr|usd|\$|€|£|₹)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/gi;
    const maxRegex = /(?:under|less than|below|max|upto)\s*(?:rs\.?|pkr|usd|\$|€|£|₹)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i;
    const minRegex = /(?:above|more than|min|at least|over)\s*(?:rs\.?|pkr|usd|\$|€|£|₹)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/i;

    const cleanNumber = (s: string) => parseFloat(s.replace(/,/g, ''));
    
    // Detect currency from query
    if (this.query.includes('usd') || this.query.includes('$')) constraints.currency = 'USD';
    else if (this.query.includes('eur') || this.query.includes('€')) constraints.currency = 'EUR';
    else if (this.query.includes('pkr') || this.query.includes('rs')) constraints.currency = 'PKR';

    // Range
    let match = this.query.match(priceRegex);
    if (match) {
      constraints.minPrice = cleanNumber(match[1]);
      constraints.maxPrice = cleanNumber(match[2]);
      constraints.constraints.push({ type: 'price', value: { min: constraints.minPrice, max: constraints.maxPrice }, confidence: 0.98, sourceText: match[0] });
      return;
    }
    
    // Max only
    match = this.query.match(maxRegex);
    if (match) {
      constraints.maxPrice = cleanNumber(match[1]);
      constraints.constraints.push({ type: 'price', value: { max: constraints.maxPrice }, confidence: 0.9, sourceText: match[0] });
    }
    
    // Min only
    match = this.query.match(minRegex);
    if (match) {
      constraints.minPrice = cleanNumber(match[1]);
      constraints.constraints.push({ type: 'price', value: { min: constraints.minPrice }, confidence: 0.9, sourceText: match[0] });
    }
    
    // Fallback: any number near currency symbol
    if (constraints.minPrice === undefined && constraints.maxPrice === undefined) {
      const matches = [...this.query.matchAll(singlePriceRegex)];
      if (matches.length === 1) {
        const val = cleanNumber(matches[0][1]);
        constraints.maxPrice = val;
        constraints.constraints.push({ type: 'price', value: { max: val }, confidence: 0.6, sourceText: matches[0][0] });
      }
    }
  }

  private extractRating(constraints: UserConstraints): void {
    const ratingRegex = /(\d+(?:\.\d+)?)\s*(?:\+|\s*star|\s*rating| and above| or higher)/i;
    const match = this.query.match(ratingRegex);
    if (match) {
      constraints.minRating = parseFloat(match[1]);
      constraints.constraints.push({ type: 'rating', value: constraints.minRating, confidence: 0.85, sourceText: match[0] });
    }
  }

  private extractBrands(constraints: UserConstraints): void {
    // Use compromise to find proper nouns and nouns adjacent to "brand"
    const brandContext = this.doc.match('(brand|from|by) #ProperNoun').out('array');
    const properNouns = this.doc.match('#ProperNoun').out('array');
    const allCandidates = [...brandContext, ...properNouns];
    
    for (const noun of allCandidates) {
      const lower = noun.toLowerCase();
      if (ConstraintExtractor.knownBrands.has(lower)) {
        constraints.brands.push(lower);
        constraints.constraints.push({ type: 'brand', value: lower, confidence: 0.95, sourceText: noun });
      }
    }
    
    // Also check bigrams
    const terms = this.doc.terms().out('array');
    for (let i = 0; i < terms.length - 1; i++) {
      const bigram = `${terms[i]} ${terms[i+1]}`.toLowerCase();
      if (ConstraintExtractor.knownBrands.has(bigram)) {
        constraints.brands.push(bigram);
        constraints.constraints.push({ type: 'brand', value: bigram, confidence: 0.9, sourceText: bigram });
      }
    }
  }

  private extractSimpleAttributes(constraints: UserConstraints): void {
    const words = this.query.split(/\W+/);
    words.forEach(w => {
      if (ConstraintExtractor.colors.has(w)) {
        constraints.colors.push(w);
        constraints.constraints.push({ type: 'color', value: w, confidence: 0.8, sourceText: w });
      }
      if (ConstraintExtractor.connectivity.has(w)) {
        constraints.connectivity.push(w);
        constraints.constraints.push({ type: 'connectivity', value: w, confidence: 0.8, sourceText: w });
      }
    });
  }

  private async extractFeaturesSemantic(constraints: UserConstraints): Promise<void> {
    // If canonical features not initialized, skip or use fallback
    if (ConstraintExtractor.canonicalFeatures.length === 0) {
      console.warn('Canonical features not initialized. Using keyword fallback.');
      this.fallbackKeywordFeatures(constraints);
      return;
    }

    // Extract noun phrases from desire clauses
      const desireClauses = this.doc.match('(want|need|looking for|must have|like|prefer|with|having|good) .').out('text');
      const desireDoc = nlp(desireClauses);
      
      // Explicitly cast to string[] to avoid TypeScript inference issues
      const nounPhrases = desireDoc.nouns().out('array') as string[];
      const adjNounPhrases = desireDoc.match('#Adjective #Noun').out('array') as string[];
      
      const phrases = [...new Set([...nounPhrases, ...adjNounPhrases])]
        .map((p: string) => p.toLowerCase().trim())
        .filter(p => p.length > 0);

      if (phrases.length === 0) return;

    // Encode canonical features once and cache
    if (!ConstraintExtractor.cachedCanonicalEmbeddings) {
      const canonicalTexts = ConstraintExtractor.canonicalFeatures;
      const embeddings = await ConstraintExtractor.featureEmbedder(canonicalTexts, {
        pooling: 'mean',
        normalize: true,
      });
      ConstraintExtractor.cachedCanonicalEmbeddings = embeddings;
    }

// Later, when you need to read it:

    const phraseEmbeddings = await ConstraintExtractor.featureEmbedder(phrases, { pooling: 'mean', normalize: true });
    const canonicalEmbs = ConstraintExtractor.cachedCanonicalEmbeddings!;

    
    const threshold = 0.65;
    for (let i = 0; i < phrases.length; i++) {
      const phraseEmb = phraseEmbeddings[i];
      let bestScore = -1;
      let bestFeature = '';
      
      for (let j = 0; j < ConstraintExtractor.canonicalFeatures.length; j++) {
        const score = this.cosineSimilarity(phraseEmb, canonicalEmbs[j]);
        if (score > bestScore) {
          bestScore = score;
          bestFeature = ConstraintExtractor.canonicalFeatures[j];
        }
      }
      
      if (bestScore >= threshold) {
        constraints.desiredFeatures.push(bestFeature);
        constraints.constraints.push({
          type: 'feature',
          value: bestFeature,
          confidence: bestScore,
          sourceText: phrases[i]
        });
      } else {
        // Fuzzy string match as fallback
        const fuzzyMatch = this.fuzzyMatchFeature(phrases[i]);
        if (fuzzyMatch) {
          constraints.desiredFeatures.push(fuzzyMatch);
          constraints.constraints.push({
            type: 'feature',
            value: fuzzyMatch,
            confidence: 0.6,
            sourceText: phrases[i]
          });
        } else {
          // Keep original phrase as custom feature
          constraints.desiredFeatures.push(phrases[i]);
          constraints.constraints.push({
            type: 'feature',
            value: phrases[i],
            confidence: 0.5,
            sourceText: phrases[i]
          });
        }
      }
    }
  }

  private fallbackKeywordFeatures(constraints: UserConstraints): void {
    // Simple keyword fallback when embeddings not ready
    const featureKeywords = [
      'battery', 'sound quality', 'noise cancel', 'wireless', 'bluetooth',
      'waterproof', 'durable', 'comfort', 'bass', 'mic', 'microphone',
      'gaming', 'lightweight', 'fast charging', 'long lasting'
    ];
    featureKeywords.forEach(f => {
      if (this.query.includes(f)) {
        constraints.desiredFeatures.push(f);
        constraints.constraints.push({ type: 'feature', value: f, confidence: 0.7, sourceText: f });
      }
    });
  }

  private fuzzyMatchFeature(phrase: string): string | null {
    let bestMatch: string | null = null;
    let bestDist = Infinity;
    const maxDist = 3;
    
    for (const feat of ConstraintExtractor.canonicalFeatures) {
      const dist = levenshtein(phrase, feat);
      if (dist < bestDist && dist <= maxDist) {
        bestDist = dist;
        bestMatch = feat;
      }
    }
    return bestMatch;
  }

  private extractExcludedFeatures(constraints: UserConstraints): void {
  // Compromise can match negated phrases directly:
    const negClauses = this.doc
      .match('(no|without|avoid|dont want|do not want|never|not) [#Noun+]')
      .out('array');

    negClauses.forEach((clause: string) => {
      // Extract only the noun part (e.g., "wireless" from "no wireless")
      const noun = clause.replace(/^(no|without|avoid|dont want|do not want|never|not)\s+/i, '');
      constraints.excludedFeatures.push(noun.toLowerCase());
      constraints.constraints.push({
        type: 'excluded_feature',
        value: noun.toLowerCase(),
        confidence: 0.85,
        sourceText: clause,
      });
    });
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  // private static cachedCanonicalEmbeddings: any = null;
}