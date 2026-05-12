import type { ParsedIntent } from "../types";

import { parsePriceRange } from "./priceParser";
import { preprocessQuery } from "./preprocess";
import {
  extractBrands,
  extractExcludedBrands,
  extractFeatures,
  extractLimit,
  extractProductType,
  extractSortBy,
} from "./tokenExtractor";

export function parseIntent(query: string): ParsedIntent {
  const preprocessed = preprocessQuery(query);
  const productType = extractProductType(preprocessed.normalized);
  const brands = extractBrands(preprocessed.normalized, productType);

  return {
    rawQuery: preprocessed.raw,
    productType,
    brands,
    excludedBrands: extractExcludedBrands(preprocessed.normalized, brands),
    features: extractFeatures(preprocessed.normalized),
    priceRange: parsePriceRange(preprocessed.normalized),
    sortBy: extractSortBy(preprocessed.normalized),
    limit: extractLimit(preprocessed.normalized),
  };
}
