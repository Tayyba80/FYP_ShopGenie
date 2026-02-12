import { Product, SearchQuery, RankedProduct, ScoreBreakdown, RankingMetrics, RankingConfig } from '../types';

export class RankingEngine {
  private config: RankingConfig;
  
  constructor(userQuery: SearchQuery) {
    this.config = {
      weights: {
        rating: 0.25,      
        sentiment: 0.20,   
        reviewCount: 0.15, 
        price: 0.15,       
        relevance: 0.10,   
        credibility: 0.05,
        delivery: 0.05,    
        warranty: 0.05     
      },
      thresholds: {
        minReviews: 5,
        maxPrice: userQuery.filters.maxPrice,
        minRating: 3.0
      }
    };
  }

  //   async rankProducts(products: Product[]): Promise<{
  //   rankedProducts: RankedProduct[];
  //   topProducts: Product[];
  //   metrics: RankingMetrics;
  //   explanation: string;
  // }> {
  //   console.log(`🏆 Ranking ${products.length} products...`);
    
  //   // Step 1: Filter out low-quality products
  //   const filteredProducts = this.filterProducts(products);
    
  //   // Step 2: Calculate scores for each product
  //   const rankedProducts = await this.calculateAllScores(filteredProducts);
    
  //   // Step 3: Sort by score descending
  //   const sortedProducts = this.sortByScore(rankedProducts);
    
  //   // Step 4: Add ranking positions
  //   const withRankings = this.assignRanks(sortedProducts);
    
  //   // Step 5: Get top 5 products
  //   const topProducts = this.getTopProducts(withRankings);
    
  //   // Step 6: Generate metrics and explanation
  //   const metrics = this.calculateMetrics(withRankings);
  //   const explanation = this.generateExplanation(topProducts, metrics);
    
  //   return {
  //     rankedProducts: withRankings,
  //     topProducts: topProducts.map(rp => rp.product),
  //     metrics,
  //     explanation
  //   };
  // }

  private filterProducts(products: Product[]): Product[] {
    return products.filter(product => {
      // Filter by minimum reviews
      if (product.reviews < this.config.thresholds.minReviews) {
        console.log(`Filtered out ${product.name} - insufficient reviews: ${product.reviews}`);
        return false;
      }
      
      // Filter by minimum rating
      if (product.rating < this.config.thresholds.minRating) {
        console.log(`Filtered out ${product.name} - low rating: ${product.rating}`);
        return false;
      }
      
      // Filter by max price if specified
      if (this.config.thresholds.maxPrice && product.price > this.config.thresholds.maxPrice) {
        console.log(`Filtered out ${product.name} - over budget: ${product.price} > ${this.config.thresholds.maxPrice}`);
        return false;
      }
      
      return true;
    });
  }
}