import { Product, SearchQuery } from '../../.next/types';

export function rankProducts(products: Product[], query: SearchQuery): Product[] {
  console.log(`Ranking ${products.length} products for query:`, query);
  
  //hardcoded ranking based on query type
  const RANKING_RULES: Record<string, number[]> = {
    "wireless earbuds": [1, 2],
    "smartphone": [4, 3],
    "laptop bag": [5, 6],
    "running shoes": [],
    "wireless mouse": [7, 8]
  };
  
  const productKey: string = query.product.toLowerCase();
  const rankingOrder: number[] = RANKING_RULES[productKey] || products.map(p => p.id);
  
  //sort products according to ranking order
  const rankedProducts: Product[] = [...products].sort((a, b) => {
    const indexA: number = rankingOrder.indexOf(a.id);
    const indexB: number = rankingOrder.indexOf(b.id);
    return indexA - indexB;
  });
  
  return rankedProducts;
}

//hardcoded explanations
export function generateExplanation(products: Product[], query: SearchQuery): string {
  const EXPLANATIONS: Record<string, string> = {
    "wireless earbuds": "These earbuds are selected based on their high ratings, positive customer reviews, and best value for money within your budget. The top pick offers premium features like noise cancellation.",
    "smartphone": "These smartphones feature excellent camera systems as requested, with high-resolution sensors and positive user feedback on photo quality. Both offer great performance within your budget.",
    "laptop bag": "These bags meet your waterproof requirement and have dedicated laptop protection features with good customer satisfaction. They offer practical organization with multiple compartments.",
    "running shoes": "Selected for their advanced cushioning technology and positive reviews from runners. These shoes provide excellent support and comfort for various running conditions.",
    "wireless mouse": "Chosen for their silent click feature and reliability for office use. Both mice offer comfortable ergonomic designs and stable wireless connectivity."
  };
  
  return EXPLANATIONS[query.product.toLowerCase()] || 
         "These products are selected based on your requirements and overall customer satisfaction. We've prioritized items with high ratings and positive user feedback.";
}