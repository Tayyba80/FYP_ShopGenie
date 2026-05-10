// backend/integration/example.ts
import { ShopGenieExplanationModule, RankedProduct } from '../explanation-module';

// This is where your teammate's ranking engine would call your module
async function getRecommendationsWithExplanations(query: string, rankedProducts: RankedProduct[]) {
  const explanationModule = new ShopGenieExplanationModule();
  const result = await explanationModule.process(query, rankedProducts);
  
  // Send result to frontend
  console.log(result.chatResponse);
  console.log(result.productCards);
  return result;
}