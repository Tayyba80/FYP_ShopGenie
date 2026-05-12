export type SupportedCurrency = "PKR" | "USD";

export type IntentSortBy =
  | "price_asc"
  | "price_desc"
  | "rating"
  | "relevance";

export interface PriceRange {
  min: number | null;
  max: number | null;
  currency: SupportedCurrency;
}

export interface ParsedIntent {
  rawQuery: string;

  productType: string;

  brands: string[];

  excludedBrands: string[];

  features: string[];

  priceRange: PriceRange;

  sortBy: IntentSortBy;

  limit: number | null;
}
