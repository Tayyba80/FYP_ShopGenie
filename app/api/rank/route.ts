// app/api/rank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { RankingEngine } from '@/lib/ranking/rankingEngine';
import { ConstraintExtractor } from '@/lib/ranking/constraintExtractor';

export async function POST(request: NextRequest) {
  const { query, products } = await request.json();

  // 1. Build canonical features from the products' specs
  const specKeys = new Set<string>();
  for (const product of products) {
    if (product.specs && typeof product.specs === 'object') {
      Object.keys(product.specs).forEach(key => specKeys.add(key));
    }
  }
  ConstraintExtractor.initializeCanonicalFeatures(specKeys);

  // 2. Rank products
  const engine = new RankingEngine();
  const ranked = await engine.rankProducts(products, query);

  return NextResponse.json({ ranked });
}