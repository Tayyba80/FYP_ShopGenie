export interface Product {
  id: number;
  name: string;
  price: number;
  rating: number;
  reviews: number;
  reviewsText: string[];      
  store: string;
  category: string;
  features: string[];
  deliveryTime: string;
  warranty: string;
  platform: string;
  createdAt: string;
  soldCount?: number;
  returnRate?: number;
  imageUrls?: string[];
}

export interface SearchQuery {
  product: string;
  category: string;
  filters: {
    maxPrice?: number;
    minRating?: number;
    features?: string[];
  };
  intent: 'search' | 'help' | 'filter';
}

export interface RankedProduct {
  product: Product;
  score: number;                    
  breakdown: ScoreBreakdown;        
  rank: number;                    
}

export interface ScoreBreakdown {
  rating: { raw: number; score: number; weight: number };
  sentiment: { score: number; confidence: number; weight: number };
  reviews: { count: number; score: number; weight: number };
  price: { raw: number; score: number; weight: number };
  relevance: { score: number; weight: number };
  credibility: { score: number; weight: number };
  delivery: { score: number; weight: number };
  warranty: { score: number; weight: number };
}

export interface RankingMetrics {
  totalProducts: number;
  averageScore: number;
  scoreDistribution: number[];
  topPerformingFeatures: string[];
  weakestAspects: string[];
}

export interface RankingConfig {
  weights: {
    rating: number;        
    sentiment: number;
    reviewCount: number;
    price: number;
    relevance: number;
    credibility: number;
    delivery: number;
    warranty: number;
  };
  thresholds: {
    minReviews: number;    
    maxPrice?: number;     // User's max price
    minRating: number;     
  };
}

export interface ChatResponse {
  products: Product[];
  explanation: string;
  originalQuery: string;
  totalResults: number;
  timestamp: string;
}

export interface CacheItem {
  data: ChatResponse;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'product_results';
  data?: ChatResponse;
}