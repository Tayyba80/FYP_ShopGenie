// lib/ranking/constraintExtractor.ts

export interface UserConstraints {
  minPrice?: number;
  maxPrice?: number;
  desiredFeatures: string[];
  rawQuery: string;
}

export class ConstraintExtractor {
  private query: string;

  constructor(query: string) {
    this.query = query.toLowerCase();
  }

  extract(): UserConstraints {
    const constraints: UserConstraints = {
      desiredFeatures: [],
      rawQuery: this.query,
    };

    // Extract price range
    const pricePatterns = [
      /(?:rs\.?\s*|pkr\s*|price\s*(?:between|from)?\s*)(\d+)\s*(?:to|-)\s*(\d+)/i,
      /(\d+)\s*(?:to|-)\s*(\d+)\s*(?:rs|pkr|rupees)/i,
      /under\s*(\d+)\s*(?:rs|pkr|rupees)/i,
      /above\s*(\d+)\s*(?:rs|pkr|rupees)/i,
    ];

    for (const pattern of pricePatterns) {
      const match = this.query.match(pattern);
      if (match) {
        if (match[1] && match[2]) {
          constraints.minPrice = parseInt(match[1], 10);
          constraints.maxPrice = parseInt(match[2], 10);
        } else if (match[1] && pattern.source.includes('under')) {
          constraints.maxPrice = parseInt(match[1], 10);
        } else if (match[1] && pattern.source.includes('above')) {
          constraints.minPrice = parseInt(match[1], 10);
        }
        break;
      }
    }

    // Extract desired features (simple keyword extraction)
    const featureKeywords = [
      'battery', 'sound quality', 'noise cancel', 'wireless', 'bluetooth',
      'waterproof', 'durable', 'comfort', 'bass', 'mic', 'microphone',
      'gaming', 'lightweight', 'fast charging', 'long lasting'
    ];

    const words = this.query.split(/\s+/);
    featureKeywords.forEach(feature => {
      if (this.query.includes(feature)) {
        constraints.desiredFeatures.push(feature);
      }
    });

    // Remove duplicates
    constraints.desiredFeatures = [...new Set(constraints.desiredFeatures)];

    return constraints;
  }
}