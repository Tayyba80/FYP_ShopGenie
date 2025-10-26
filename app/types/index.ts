export interface Product{
    id: number;
    name: string;
    price: number;
    rating: number;
    reviews: number;
    store: string;
    category: string;
    features: string[];
    deliveryTime: string;
    warranty: string;
}

export interface SearchQuery {
  product: string;
  category: string;
  filters: {
    maxPrice?: number;
    features?: string[];
    sortBy?: string;
  };
  intent: 'search' | 'help' | 'filter';
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