// types/product.ts

export interface Review {
  reviewerName?: string;
  text: string;
  rating: number;
  date?: string;
}

export interface Price {
  amount: number;
  currency: string;
  originalAmount?: number;
  shippingCost?: number;
}

export interface Rating {
  average: number;
  count: number;
}

export interface Product {
  productId: string;
  platform: string;
  title: string;
  productUrl: string;
  mainImageUrl: string;
  brand?: string;
  model?: string;
  category: string;
  description?: string;
  keyFeatures?: string[];
  price: Price;
  availability: string;
  estimatedDelivery?: string;
  rating: Rating;
  reviews: Review[];
  specifications?: Record<string, string>;
  timestamp: string;
}

export interface RankedProduct {
  product: Product;
  score: number;
  breakdown: {
    priceScore: number;
    ratingScore: number;
    sentimentScore: number;
    featureScore: number;
    credibilityFactor: number;      // replaces authenticityPenalty
    hardConstraintPenalty: number;   // new
    total: number;
  };
  matchingFeatures: string[];
  sentimentSummary: {
    positive: number;
    negative: number;
    neutral: number;
    spamRatio: number;
    confidence: number;
  };
  rankingReason: string;
}