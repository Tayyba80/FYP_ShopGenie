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

  async rankProducts(products: Product[]): Promise<{
    rankedProducts: RankedProduct[];
    topProducts: Product[];
    metrics: RankingMetrics;
    explanation: string;
  }> {
    console.log(`🏆 Ranking ${products.length} products...`);
    
    // Step 1: Filter out low-quality products
    const filteredProducts = this.filterProducts(products);
    
    // Step 2: Calculate scores for each product
    const rankedProducts = await this.calculateAllScores(filteredProducts);
    
    // Step 3: Sort by score descending
    const sortedProducts = this.sortByScore(rankedProducts);
    
    // Step 4: Add ranking positions
    const withRankings = this.assignRanks(sortedProducts);
    
    // Step 5: Get top 5 products
    const topProducts = this.getTopProducts(withRankings);
    
    // Step 6: Generate metrics and explanation
    const metrics = this.calculateMetrics(withRankings);
    const explanation = this.generateExplanation(topProducts, metrics);
    
    return {
      rankedProducts: withRankings,
      topProducts: topProducts.map(rp => rp.product),
      metrics,
      explanation
    };
  }

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

  private async calculateAllScores(products: Product[]): Promise<RankedProduct[]> {
    const scoringPromises = products.map(async (product, index) => {
      console.log(`📊 Scoring product ${index + 1}/${products.length}: ${product.name}`);
      
      const breakdown = await this.calculateScoreBreakdown(product);
      const totalScore = this.calculateTotalScore(breakdown);
      
      return {
        product,
        score: totalScore,
        breakdown,
        rank: 0 // will assignlater
      };
    }); 
    return await Promise.all(scoringPromises);
  }

  private async calculateScoreBreakdown(product: Product): Promise<ScoreBreakdown> {
    const [
      ratingScore,
      sentimentScore,
      reviewCountScore,
      priceScore,
      relevanceScore,
      credibilityScore,
      deliveryScore,
      warrantyScore
    ] = await Promise.all([
      this.calculateRatingScore(product),
      this.analyzeReviewSentiment(product),
      this.calculateReviewCountScore(product),
      this.calculatePriceScore(product),
      this.calculateRelevanceScore(product),
      this.analyzeReviewCredibility(product),
      this.calculateDeliveryScore(product),
      this.calculateWarrantyScore(product)
    ]);
    
    return {
      rating: { raw: product.rating, score: ratingScore, weight: this.config.weights.rating },
      sentiment: { score: sentimentScore.score, confidence: sentimentScore.confidence, weight: this.config.weights.sentiment },
      reviews: { count: product.reviews, score: reviewCountScore, weight: this.config.weights.reviewCount },
      price: { raw: product.price, score: priceScore, weight: this.config.weights.price },
      relevance: { score: relevanceScore, weight: this.config.weights.relevance },
      credibility: { score: credibilityScore, weight: this.config.weights.credibility },
      delivery: { score: deliveryScore, weight: this.config.weights.delivery },
      warranty: { score: warrantyScore, weight: this.config.weights.warranty }
    };
  }

  private calculateRatingScore(product: Product): number {
    let score = (product.rating / 5) * 100;  // Normalize rating to 0-100 scale
    // Apply logarithmic curve
    if (product.rating >= 4.5) score = score * 1.2; 
    if (product.rating >= 4.8) score = score * 1.3; 
    return Math.min(100, score);
  }

  private async analyzeReviewSentiment(product: Product): Promise<{score: number; confidence: number}> {
    if (!product.reviewsText || product.reviewsText.length === 0) {
      return { score: 50, confidence: 0 }; // Neutral if no reviews
    } 
    const sentiments = product.reviewsText.map(review => this.analyzeSingleReview(review));
    
    // Calculate average (sum(score)/N) sentiment
    const avgSentiment = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    
    // Calculate confidence based on review count and variance
    const variance = this.calculateSentimentVariance(sentiments.map(s => s.score));
    const confidence = Math.max(0.1, 1 - (variance * 0.5)); 
    
    return {
      score: avgSentiment * 100,
      confidence
    };
  }

  private analyzeSingleReview(review: string): {score: number; keywords: string[]} {
    const lowerReview = review.toLowerCase();
    //Keyword matching
    const positiveKeywords = [
      'excellent', 'amazing', 'great', 'good', 'perfect', 'best', 'love', 'awesome',
      'recommend', 'worth', 'quality', 'fast', 'comfortable', 'reliable', 'durable',
      'satisfied', 'happy', 'pleased', 'impressed', 'outstanding', 'superb', 'fantastic'
    ];
    
    const negativeKeywords = [
      'bad', 'worst', 'poor', 'terrible', 'waste', 'avoid', 'fake', 'scam',
      'broken', 'defective', 'slow', 'uncomfortable', 'disappointed', 'cheap',
      'useless', 'horrible', 'awful', 'rubbish', 'junk', 'garbage'
    ];
    
    // Count matches
    let positiveCount = 0;
    let negativeCount = 0;
    
    positiveKeywords.forEach(word => {
      if (lowerReview.includes(word)) positiveCount++;
    });
    
    negativeKeywords.forEach(word => {
      if (lowerReview.includes(word)) negativeCount++;
    });

    //Review length analysis (longer reviews often more thoughtful)
    const lengthScore = Math.min(review.length / 100, 1); // Cap at 1
    
    // Exclamation analysis (excitement indicator)
    const exclamationCount = (review.match(/!/g) || []).length;
    const exclamationScore = Math.min(exclamationCount * 0.2, 0.5); // Max 0.5 boost
    
    // Emoji detection (if any)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    const emojiCount = (review.match(emojiRegex) || []).length;
    const emojiScore = Math.min(emojiCount * 0.1, 0.3); // Max 0.3 boost
    
    // Calculate base sentiment
    const totalKeywords = positiveCount + negativeCount;
    let baseSentiment = 0.5; // Neutral
    
    if (totalKeywords > 0) {
      baseSentiment = positiveCount / totalKeywords;
    }
    
    // Apply modifiers
    let finalScore = baseSentiment;
    finalScore += (lengthScore * 0.1); // Longer reviews get up to 10% boost
    finalScore += exclamationScore;
    finalScore += emojiScore;
    
    // Extract important keywords
    const keywords = [...positiveKeywords, ...negativeKeywords]
      .filter(word => lowerReview.includes(word))
      .slice(0, 5);
    
    return {
      score: Math.max(0, Math.min(1, finalScore)), // Ensure 0-1 range
      keywords
    };
  }

  private calculateSentimentVariance(scores: number[]): number {
    if (scores.length <= 1) return 0;
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    //Variance=N∑(scorei​−mean)2​, It measures how far values are from the mean.
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return variance; // low variance = higher confidence
  }

  private calculateReviewCountScore(product: Product): number {
    // Logarithmic scale: log10(reviews + 1) * 20, capped at 100
    const score = Math.min(100, Math.log10(product.reviews + 1) * 20); 
    // Bonus for products with many reviews
    if (product.reviews > 1000) {
      return Math.min(100, score * 1.1);
    } 
    return score;
  }

  private calculatePriceScore(product: Product): number {
    if (!this.config.thresholds.maxPrice) {
      return 50; // Neutral
    }
    const maxPrice = this.config.thresholds.maxPrice;
    if (product.price > maxPrice) {
      return 0; // Over budget 
    }
    // Score formula: Lower price gets higher score, but not linearly
    // 90% of budget = 10% score, 50% of budget = 80% score, 10% of budget = 100% score
    const priceRatio = product.price / maxPrice;   
    // Exponential decay: Score drops faster as price approaches max
    let score = 100 * Math.exp(-2.5 * priceRatio);
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
  }

  //////////////////////////////////////////////////////////////////////
    // This would use the user query to check feature matching in future
  /////////////////////////////////////////////////////////////////////
    private calculateRelevanceScore(product: Product): number { 
    // For now, using a simple feature count approach
    const baseScore = Math.min(100, product.features.length * 10); // 10 points per feature
    // Bonus for key features
    const premiumFeatures = ['waterproof', 'noise cancelling', 'wireless charging', 'premium'];
    const hasPremium = premiumFeatures.some(feature => 
      product.features.some(f => f.toLowerCase().includes(feature))
    );
    return hasPremium ? Math.min(100, baseScore * 1.2) : baseScore;
  }

  private async analyzeReviewCredibility(product: Product): Promise<number> {
    if (!product.reviewsText || product.reviewsText.length < 3) {
      return 50; // Neutral
    } 
    let credibilityScore = 70; 
    // Review length variety (mixed lengths = more credible)
    const lengths = product.reviewsText.map(r => r.length);
    const lengthVariance = this.calculateVariance(lengths);
    
    if (lengthVariance > 100) { // Good variance in lengths
      credibilityScore += 10;
    } else if (lengthVariance < 20) { // All reviews similar length (suspicious)
      credibilityScore -= 15;
    }

    //////////////////////////////////////////////////////////////////////////////////////
    // Review timing pattern (if you had timestamps)
    // For now, pending
    /////////////////////////////////////////////////////////////////////////////////////

    // Keyword repetition detection
    const allReviews = product.reviewsText.join(' ').toLowerCase();
    const commonWords = ['good', 'excellent', 'amazing', 'best', 'product'];
    
    let repetitionCount = 0;
    commonWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = allReviews.match(regex);
      if (matches && matches.length > product.reviewsText.length * 0.5) {
        repetitionCount++;
      }
    });
    
    if (repetitionCount > 2) {
      credibilityScore -= 20;
    }
    
    // Extreme rating correlation, If rating is 5.0 but reviews have negative sentiment, suspicious
    if (product.rating === 5 && product.reviewsText.length > 10) {
      // Check if any reviews are negative
      const hasNegative = product.reviewsText.some(review => {
        const negativeWords = ['bad', 'poor', 'terrible', 'worst'];
        return negativeWords.some(word => review.toLowerCase().includes(word));
      });
      
      if (!hasNegative) {
        credibilityScore -= 10; // All perfect reviews suspicious
      }
    }
    
    return Math.max(0, Math.min(100, credibilityScore));
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length <= 1) return 0;
    
    const mean = numbers.reduce((a, b) => a + b) / numbers.length;
    const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
    
    return variance;
  }

  private calculateDeliveryScore(product: Product): number {
    const deliveryTime = product.deliveryTime.toLowerCase();
    
    if (deliveryTime.includes('same day') || deliveryTime.includes('1 day')) {
      return 100;
    } else if (deliveryTime.includes('2-3') || deliveryTime.includes('2 days')) {
      return 80;
    } else if (deliveryTime.includes('3-5') || deliveryTime.includes('3 days')) {
      return 60;
    } else if (deliveryTime.includes('1 week')) {
      return 40;
    } else if (deliveryTime.includes('2 week')) {
      return 20;
    } else {
      return 10; // Slow or unknown delivery
    }
  }

  private calculateWarrantyScore(product: Product): number {
    const warranty = product.warranty.toLowerCase();
    const monthMatch = warranty.match(/(\d+)\s*month/i);
    const yearMatch = warranty.match(/(\d+)\s*year/i);
    let months = 0;
    if (monthMatch) {
      months = parseInt(monthMatch[1]);
    } else if (yearMatch) {
      months = parseInt(yearMatch[1]) * 12;
    } 
    // Score based on warranty length
    if (months >= 24) return 100;
    if (months >= 12) return 80;
    if (months >= 6) return 60;
    if (months >= 3) return 40;
    if (months >= 1) return 20;
    
    return 10; // Less than 1 month or unknown
  }
  
  private calculateTotalScore(breakdown: ScoreBreakdown): number {
    let total = 0;
    
    total += breakdown.rating.score * breakdown.rating.weight;
    total += breakdown.sentiment.score * breakdown.sentiment.weight;
    total += breakdown.reviews.score * breakdown.reviews.weight;
    total += breakdown.price.score * breakdown.price.weight;
    total += breakdown.relevance.score * breakdown.relevance.weight;
    total += breakdown.credibility.score * breakdown.credibility.weight;
    total += breakdown.delivery.score * breakdown.delivery.weight;
    total += breakdown.warranty.score * breakdown.warranty.weight;
    
    // Apply sentiment confidence as multiplier
    const confidenceMultiplier = 0.7 + (breakdown.sentiment.confidence * 0.3);
    total *= confidenceMultiplier;
    
    return Math.round(total * 10) / 10; // Round to 1 decimal
  }

  private sortByScore(rankedProducts: RankedProduct[]): RankedProduct[] {
    return [...rankedProducts].sort((a, b) => b.score - a.score);
  }

  private assignRanks(rankedProducts: RankedProduct[]): RankedProduct[] {
    return rankedProducts.map((rp, index) => ({
      ...rp,
      rank: index + 1
    }));
  }
 
  private getTopProducts(rankedProducts: RankedProduct[], count: number = 5): RankedProduct[] {
    return rankedProducts.slice(0, count);
  }

    private calculateMetrics(rankedProducts: RankedProduct[]): RankingMetrics {
    const scores = rankedProducts.map(rp => rp.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    // Score distribution (buckets)
    const distribution = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
    
    scores.forEach(score => {
      const bucket = Math.floor(score / 20);
      if (bucket >= 0 && bucket < 5) {
        distribution[bucket]++;
      }
    });
    
    // Find common features in top products
    const topFeatures = new Map<string, number>();
    rankedProducts.slice(0, 5).forEach(rp => {
      rp.product.features.forEach(feature => {
        topFeatures.set(feature, (topFeatures.get(feature) || 0) + 1);
      });
    });
    
    const topPerformingFeatures = Array.from(topFeatures.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature]) => feature);
    
    // Identify weakest scoring aspects across all products
    const aspectScores = {
      rating: 0,
      sentiment: 0,
      reviews: 0,
      price: 0,
      relevance: 0,
      credibility: 0,
      delivery: 0,
      warranty: 0
    };
    
    rankedProducts.forEach(rp => {
      aspectScores.rating += rp.breakdown.rating.score;
      aspectScores.sentiment += rp.breakdown.sentiment.score;
      aspectScores.reviews += rp.breakdown.reviews.score;
      aspectScores.price += rp.breakdown.price.score;
      aspectScores.relevance += rp.breakdown.relevance.score;
      aspectScores.credibility += rp.breakdown.credibility.score;
      aspectScores.delivery += rp.breakdown.delivery.score;
      aspectScores.warranty += rp.breakdown.warranty.score;
    });
    
    const count = rankedProducts.length;
    const avgAspectScores = Object.entries(aspectScores).map(([key, value]) => ({
      aspect: key,
      score: value / count
    }));
    
    const weakestAspects = avgAspectScores
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(item => item.aspect);
    
    return {
      totalProducts: rankedProducts.length,
      averageScore: avgScore,
      scoreDistribution: distribution,
      topPerformingFeatures,
      weakestAspects
    };
  }

  private generateExplanation(topProducts: RankedProduct[], metrics: RankingMetrics): string {
    if (topProducts.length === 0) {
      return "No products met the minimum criteria for ranking.";
    }
    
    const topProduct = topProducts[0];
    const secondProduct = topProducts[1];
    
    const explanations = [];
    
    // Top product explanation
    explanations.push(`**Top Recommendation: ${topProduct.product.name}**`);
    explanations.push(`- **Overall Score**: ${topProduct.score.toFixed(1)}/100`);
    explanations.push(`- **Key Strengths**:`);
    
    // Identify top 3 strengths
    const strengths = [];
    if (topProduct.breakdown.rating.score >= 80) strengths.push(`High rating (${topProduct.product.rating}/5)`);
    if (topProduct.breakdown.sentiment.score >= 80) strengths.push(`Positive customer feedback`);
    if (topProduct.breakdown.reviews.score >= 80) strengths.push(`Many verified reviews (${topProduct.product.reviews})`);
    if (topProduct.breakdown.price.score >= 80) strengths.push(`Excellent value (₹${topProduct.product.price})`);
    
    strengths.slice(0, 3).forEach(strength => {
      explanations.push(`  ✓ ${strength}`);
    });
    
    // Comparison with runner-up
    if (secondProduct) {
      const scoreDiff = topProduct.score - secondProduct.score;
      if (scoreDiff > 5) {
        explanations.push(`\n** Clear Winner**: Beats #2 by ${scoreDiff.toFixed(1)} points`);
      } else {
        explanations.push(`\n** Close Race**: Only ${scoreDiff.toFixed(1)} points ahead of #2`);
      }
    }
    
    // Platform insights
    explanations.push(`\n**📈 Ranking Insights**:`);
    explanations.push(`- Average product score: ${metrics.averageScore.toFixed(1)}/100`);
    explanations.push(`- Top-performing feature: ${metrics.topPerformingFeatures[0] || 'N/A'}`);
    explanations.push(`- Area needing improvement: ${metrics.weakestAspects[0] || 'N/A'}`);
    
    // Recommendation
    if (topProduct.score >= 80) {
      explanations.push(`\n** Strong Recommendation**: This product excels in multiple categories and has highly positive customer feedback.`);
    } else if (topProduct.score >= 60) {
      explanations.push(`\n** Good Choice**: While not perfect, this offers the best balance of features, price, and reliability.`);
    } else {
      explanations.push(`\n** Consider Alternatives**: The top product scored moderately. Review the alternatives below.`);
    }
    
    return explanations.join('\n');
  }
  
}