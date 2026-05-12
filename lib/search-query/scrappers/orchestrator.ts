// src/ai/retrieval/orchestrator.ts
// Runs all scrapers in parallel, merges results, returns Product[]
// This is what the pipeline calls — one function, one output

import type { ParsedIntent } from "./intent";
import type { Product } from "./product";
import { scrapeDaraz }    from "./daraz";
import { scrapePriceOye } from "./priceoye";
import { scrapeAmazon }   from "./amazon";
import { closeBrowser }   from "./browser";

export interface OrchestratorResult {
  products:      Product[];
  sourcesSucess: string[];
  sourcesFailed: string[];
  totalFound:    number;
}

export async function retrieveProducts(
  intent: ParsedIntent
): Promise<OrchestratorResult> {
  const query    = buildSearchQuery(intent);
  const category = intent.productType ?? "general";

  // Run all three scrapers in parallel
  // Promise.allSettled means one failure doesn't kill the others
  const [darazResult, amazonResult] = await Promise.allSettled([
    scrapeDaraz(query, category),
    
    scrapeAmazon(query, category),
  ]);

  const products: Product[]   = [];
  const sourcesSucess: string[] = [];
  const sourcesFailed: string[] = [];

  if (darazResult.status === "fulfilled") {
    products.push(...darazResult.value);
    sourcesSucess.push("Daraz");
  } else {
    sourcesFailed.push(`Daraz: ${darazResult.reason}`);
  }



  if (amazonResult.status === "fulfilled") {
    products.push(...amazonResult.value);
    sourcesSucess.push("Amazon");
  } else {
    sourcesFailed.push(`Amazon: ${amazonResult.reason}`);
  }

  // Close shared browser after all scrapers are done
  await closeBrowser().catch(() => {});

  return {
    products,
    sourcesSucess,
    sourcesFailed,
    totalFound: products.length,
  };
}

// Build a clean search query from parsed intent
function buildSearchQuery(intent: ParsedIntent): string {
  const parts: string[] = [];

  if (intent.productType) parts.push(intent.productType);
  if (intent.brands?.length)   parts.push(intent.brands[0]);    // lead with first brand
  if (intent.features?.length) parts.push(...intent.features.slice(0, 2));

  return parts.join(" ").trim() || intent.rawQuery;
}
