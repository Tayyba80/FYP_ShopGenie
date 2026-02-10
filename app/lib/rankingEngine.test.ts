import { Product, SearchQuery } from '../types';

export class SimpleRankingEngine {
  async rankProducts(products: Product[], query: SearchQuery): Promise<Product[]> {
    console.log(`🔢 Simple ranking of ${products.length} products`);
    
    // Step 1: Basic filtering
    const filtered = products.filter(p => 
      p.rating >= 3.0 &&
      p.reviews >= 5 &&
      (!query.filters.maxPrice || p.price <= query.filters.maxPrice)
    );
    
    // Step 2: Calculate simple scores
    const scoredProducts = filtered.map(product => ({
      product,
      score: this.calculateSimpleScore(product, query)
    }));
    
    // Step 3: Sort by score
    scoredProducts.sort((a, b) => b.score - a.score);
    
    // Step 4: Return top 5
    return scoredProducts.slice(0, 5).map(sp => sp.product);
  }
  
  private calculateSimpleScore(product: Product, query: SearchQuery): number {
    let score = 0;
    
    // 1. Rating (40%)
    score += (product.rating / 5) * 40;
    
    // 2. Review count with diminishing returns (30%)
    score += Math.min(30, Math.log10(product.reviews + 1) * 10);
    
    // 3. Price (20% - cheaper is better)
    if (query.filters.maxPrice) {
      const priceRatio = 1 - (product.price / query.filters.maxPrice);
      score += Math.max(0, priceRatio * 20);
    } else {
      score += 10; // Neutral price score
    }
    
    // 4. Simple sentiment (10%)
    // const sentiment = this.calculateSimpleSentiment(product.reviewsText || []);
    // score += sentiment * 10;
    
    return score;
  }
  
  private calculateSimpleSentiment(reviews: string[]): number {
    if (reviews.length === 0) return 0.5;
    
    const positiveWords = ['good', 'excellent', 'great', 'love', 'perfect', 'best', 'recommend'];
    const negativeWords = ['bad', 'poor', 'worst', 'terrible', 'waste', 'avoid'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    reviews.forEach(review => {
      const lower = review.toLowerCase();
      if (positiveWords.some(word => lower.includes(word))) positiveCount++;
      if (negativeWords.some(word => lower.includes(word))) negativeCount++;
    });
    
    const total = positiveCount + negativeCount;
    return total > 0 ? positiveCount / total : 0.5;
  }
}