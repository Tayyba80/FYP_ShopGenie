import { SearchQuery } from '../types';

//hardcoded mapping of prompts to structured queries
const PROMPT_TO_QUERY_MAP: Record<string, SearchQuery> = {
  "i need wireless earbuds under 5000 rupees": {
    product: "wireless earbuds",
    category: "electronics",
    filters: {
      maxPrice: 5000,
      features: ["wireless", "bluetooth"]
    },
    intent: "search"
  },
  "show me smartphones with good camera under 30000": {
    product: "smartphone",
    category: "electronics",
    filters: {
      maxPrice: 30000,
      features: ["good camera", "multiple cameras"]
    },
    intent: "search"
  },
  "looking for laptop bags with waterproof feature": {
    product: "laptop bag",
    category: "bags",
    filters: {
      features: ["waterproof", "laptop compartment"]
    },
    intent: "search"
  },
  "best running shoes for men with cushioning": {
    product: "running shoes",
    category: "footwear",
    filters: {
      features: ["cushioning", "men", "running"],
      sortBy: "rating"
    },
    intent: "search"
  },
  "wireless mouse for office use with silent clicks": {
    product: "wireless mouse",
    category: "electronics",
    filters: {
      features: ["wireless", "silent", "office"],
      maxPrice: 5000
    },
    intent: "search"
  }
};

export function parseUserQuery(userMessage: string): SearchQuery {
  const lowerCaseMessage: string = userMessage.toLowerCase().trim();
  
  //return hardcoded query if prompt matches
  if (PROMPT_TO_QUERY_MAP[lowerCaseMessage]) {
    return PROMPT_TO_QUERY_MAP[lowerCaseMessage];
  }
  
  //fallback for any other input, simple keyword extraction
  const words: string[] = lowerCaseMessage.split(' ');
  const priceMatch: RegExpMatchArray | null = lowerCaseMessage.match(/(\d+)\s*(rupees|rs|₹)/);
  
  return {
    product: words.slice(0, 3).join(' ') || "general product",
    category: "general",
    filters: {
      maxPrice: priceMatch ? parseInt(priceMatch[1]) : undefined,
      features: words.filter(word => 
        ['wireless', 'waterproof', 'silent', 'good', 'best', 'men', 'office'].includes(word)
      )
    },
    intent: "search"
  };
}