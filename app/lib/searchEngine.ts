import { SearchQuery, Product } from '../../.next/types';
import { sampleProducts } from '../data/sampleProducts';

export function searchProducts(query: SearchQuery): Product[] {
  const { product, category, filters } = query;
  
  console.log(`Searching for: ${product} in ${category} with filters:`, filters);
  
  //hardcoded search results based on prompts
  const HARDCODED_RESULTS: Record<string, number[]> = {
    "wireless earbuds": [1, 2],
    "smartphone": [3, 4],
    "laptop bag": [5, 6],
    "running shoes": [],
    "wireless mouse": [7, 8]
  };
  
  const productKey: string = query.product.toLowerCase();
  const productIds: number[] = HARDCODED_RESULTS[productKey] || [1];
  
  //filter products 
  const results: Product[] = sampleProducts.filter(product => 
    productIds.includes(product.id)
  );
  
  let filteredResults: Product[] = [...results];
  
  if (filters.maxPrice) {
    filteredResults = filteredResults.filter(p => p.price <= filters.maxPrice!);
  }
  
  if (filters.features && filters.features.length > 0) {
    filteredResults = filteredResults.filter(product =>
      filters.features!.some(feature =>
        product.features.some(f => f.toLowerCase().includes(feature.toLowerCase()))
      )
    );
  }
  
  return filteredResults;
}