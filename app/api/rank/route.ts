// app/api/rank/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { RankingEngine } from '@/lib/ranking/rankingEngine';
import { ConstraintExtractor } from '@/lib/ranking/constraintExtractor';
import { getKnowledgeCache, setKnowledgeDb } from '@/lib/ranking/knowledgeCache';
import { ShopGenieExplanationModule } from '@/lib/explanation-module/explanationModule';
import { prisma } from '@/lib/prisma'; // adjust path to your Prisma client
import type { RankedProduct, Product } from '@/types/product';

// Optional: ensure knowledge DB is set only once, but safe to call multiple times
setKnowledgeDb(prisma);

export async function POST(request: NextRequest) {
  try {
    const { query, products } = await request.json() as { query: string; products: Product[] };

    if (!query || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Missing query or products array.' },
        { status: 400 }
      );
    }

    // ── Knowledge cache: load and learn ──────────────────────────
    const cache = getKnowledgeCache();
    await cache.loadFromDb();           // no‑op if already loaded
    await cache.learnFromProducts(products);

    // Inject known brands / features into the constraint extractor
    ConstraintExtractor.setKnownBrands(cache.getBrands());
    ConstraintExtractor.initializeCanonicalFeatures(cache.getFeatures());

    // ── RANKING ────────────────────────────────────────────────────
    const engine = new RankingEngine();
    const ranked: RankedProduct[] = await engine.rankProducts(products, query);

    // ── EXPLANATION ────────────────────────────────────────────────
    const explainer = new ShopGenieExplanationModule();
    const explanation = await explainer.process(query, ranked);

    // ── RESPONSE ──────────────────────────────────────────────────
    return NextResponse.json({
      ranked,
      explanation,
    });
  } catch (error: any) {
    console.error('Rank & Explain error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}