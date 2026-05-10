export interface ProductCatalogRepository {
  /** Fetch all distinct brand names from the product catalogue */
  getAllBrands(): Promise<string[]>;

  /** Fetch all distinct feature keys (from keyFeatures + specification keys) */
  getAllFeatureKeys(): Promise<string[]>;
}