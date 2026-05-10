// services/rankingPipeline.ts
import { Product, RankedProduct } from '../types/product';
import { RankingEngine, RankingOptions } from '../lib/ranking/rankingEngine';
import { ConstraintExtractor } from '../lib/ranking/constraintExtractor';
import { ProductCatalogRepository } from './productCatalogRepository';
import { ScorerConfig } from '../lib/ranking/productScorer';

export class RankingPipeline {
  private engine: RankingEngine;
  private initialised = false;

  constructor(private catalogRepo: ProductCatalogRepository, scorerConfig?: Partial<ScorerConfig>) {
    this.engine = new RankingEngine(scorerConfig);
  }

  /**
   * Must be called once during application startup.
   * Loads global brand and feature knowledge from the product catalogue.
   */
  async initialize(): Promise<void> {
    if (this.initialised) return;
    try {
      const [brands, featureKeys] = await Promise.all([
        this.catalogRepo.getAllBrands(),
        this.catalogRepo.getAllFeatureKeys(),
      ]);

      ConstraintExtractor.setKnownBrands(brands);
      ConstraintExtractor.initializeCanonicalFeatures(featureKeys);
      this.initialised = true;
      console.log(`🧠 RankingStore initialized: ${brands.length} brands, ${featureKeys.length} features`);
    } catch (err) {
      console.error('Failed to initialize ranking catalogue:', err);
      // Fallback: proceed with empty sets (some extraction will be weaker)
      this.initialised = true;
    }
  }

  /**
   * Rank a batch of products for a given user query.
   * Automatically ensures initialisation is complete.
   */
  async rank(products: Product[], userQuery: string, options?: RankingOptions): Promise<RankedProduct[]> {
    if (!this.initialised) await this.initialize();
    return this.engine.rankProducts(products, userQuery, options);
  }
}