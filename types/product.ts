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

export interface Breakdown {
  priceScore: number;
  ratingScore: number;
  sentimentScore: number;
  featureScore: number;
  credibilityFactor: number;
  hardConstraintPenalty: number;
  total: number;
}

export interface RankedProduct {
  product: Product;
  score: number;
  breakdown: {
    priceScore: number;
    ratingScore: number;
    sentimentScore: number;
    featureScore: number;
    credibilityFactor: number;
    hardConstraintPenalty: number;
    total: number;
  };
  matchingFeatures: string[];
  missingMustHaveFeatures: string[];
  sentimentSummary: {
    positive: number;
    negative: number;
    neutral: number;
    spamRatio: number;
    confidence: number;
  };
  rankingReason: string;
}

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