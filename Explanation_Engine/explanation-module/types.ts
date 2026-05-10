// backend/explanation-module/types.ts

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

export interface Review {
  reviewerName?: string;
  text: string;
  rating: number;
  date?: string;
}

export interface Seller {
  name: string;
  isVerified: boolean;
  rating?: number;
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
  specifications: Record<string, string | number | boolean>;
  seller?: Seller;
  timestamp: string;
}

export interface Breakdown {
  priceScore: number;
  ratingScore: number;
  sentimentScore: number;
  featureScore: number;
  credibilityFactor: number;
  hardConstraintPenalty: number;
  total: number;
}

export interface SentimentSummary {
  positive: number;
  negative: number;
  neutral: number;
  spamRatio: number;
  confidence: number;
}

export interface RankedProduct {
  product: Product;
  score: number;
  breakdown: Breakdown;
  matchingFeatures: string[];
  sentimentSummary: SentimentSummary;
  rankingReason: string;
}

// Output types for product card (what frontend will receive)
export interface ProductCard {
  rank: number;
  productId: string;
  name: string;
  brand?: string;
  productUrl: string;
  imageUrl: string;
  platform: {
    name: string;
    code: string;
    icon: string;
    color?: string;
  };
  price: {
    amount: number;
    display: string;
    original?: number;
    currency: string;
    shipping?: number;
  };
  rating: {
    score: number;
    count: number;
    display: string;
    stars: string;
    percentage?: number;
  };
  seller: {
    name: string;
    isVerified: boolean;
    rating?: number;
  };
  availability: string;
  delivery?: string;
  keyFeatures: string[];
  badges: Array<{ text: string; type: string }>;
  trustBadge: { show: boolean; text: string; type?: string };
  scores: {
    overall: number;
    price: number;
    rating: number;
    features: number;
    trust: number;
  };
  sentiment: {
    positive: number;
    spamRatio: number;
  };
  explanation: {
    bulletPoints: string[];
    short: string;
    natural: string | null;
    rankingReason: string;
    llmUsed: boolean;
  };
  cta: {
    text: string;
    url: string;
  };
}

export interface ExplanationOutput {
  query: string;
  timestamp: string;
  totalProducts: number;
  totalFound: number;
  chatResponse: string;
  productCards: ProductCard[];
  suggestedFollowups: string[];
  stats: {
    productsProcessed: number;
    llmSuccessCount: number;
    llmSuccessRate: string;
  };
}