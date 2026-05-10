// app/api/rank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { RankingEngine } from '../../../lib/ranking/rankingEngine';
import { ConstraintExtractor } from '../../../lib/ranking/constraintExtractor';
import { getKnowledgeCache } from '../../../lib/ranking/knowledgeCache';

export async function POST(request: NextRequest) {
  try {
    const { query, products } = await request.json() as { query: string; products: any[] };

    const cache = getKnowledgeCache();
    await cache.loadFromDb();            // no‑op if already loaded
    await cache.learnFromProducts(products);

    ConstraintExtractor.setKnownBrands(cache.getBrands());
    ConstraintExtractor.initializeCanonicalFeatures(cache.getFeatures());

    const engine = new RankingEngine();
    const ranked = await engine.rankProducts(products, query);

    return NextResponse.json({ ranked });
  } catch (error) {
    console.error('Ranking error:', error);
    return NextResponse.json({ error: 'Failed to rank products' }, { status: 500 });
  }
}