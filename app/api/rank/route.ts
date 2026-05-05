// app/api/rank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { RankingEngine } from '../../../lib/ranking/rankingEngine';
import { ConstraintExtractor } from '../../../lib/ranking/constraintExtractor';
import { Product } from '../../../types/product';

export async function POST(request: NextRequest) {
  try {
    const { query, products } = await request.json() as { query: string; products: Product[] };

    // 1. Build canonical features from the current product set
    const canonicalFeatures = buildCanonicalFeatureSet(products);
    ConstraintExtractor.initializeCanonicalFeatures(canonicalFeatures);

    // 2. Rank products
    const engine = new RankingEngine();
    const ranked = await engine.rankProducts(products, query);

    return NextResponse.json({ ranked });
  } catch (error) {
    console.error('Ranking error:', error);
    return NextResponse.json(
      { error: 'Failed to rank products' },
      { status: 500 }
    );
  }
}

/**
 * Extracts a comprehensive set of canonical features from the given products.
 * Uses keyFeatures, specification keys, and specification values.
 */
function buildCanonicalFeatureSet(products: Product[]): Set<string> {
  const features = new Set<string>();

  for (const product of products) {
    // 1. Key features (most important)
    if (product.keyFeatures) {
      for (const feat of product.keyFeatures) {
        features.add(feat.toLowerCase().trim());
      }
    }

    // 2. Specification keys and values
    if (product.specifications) {
      for (const [key, value] of Object.entries(product.specifications)) {
        features.add(key.toLowerCase().trim());
        if (value && typeof value === 'string') {
          features.add(value.toLowerCase().trim());
        }
      }
    }

    // 3. Optional: extract noun phrases from title/description?
    // You could add NLP here later if needed.
  }

  return features;
}