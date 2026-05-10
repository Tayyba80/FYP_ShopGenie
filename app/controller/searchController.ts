// app/controller/searchController.ts
import { RankingPipeline } from '../../services/rankingPipeline';
import { MongoProductCatalogRepository } from '../repositories/mongoProductCatalogRepository'; // your implementation

const catalogRepo = new MongoProductCatalogRepository();
const rankingPipeline = new RankingPipeline(catalogRepo, {
  // optional overrides
  weights: { price: 0.15, sentiment: 0.35 },
});

// Call once at server startup
await rankingPipeline.initialize();

// Inside your search handler
async function handleSearch(query: string) {
  // 1. Get scraped products from SearchEngine module
  const scrapedProducts: Product[] = await searchEngine.search(query); // e.g., top 100

  // 2. Rank them
  const ranked = await rankingPipeline.rank(scrapedProducts, query, {
    topN: 5,
    minScore: 0.1,
  });

  // 3. Pass to Explanation Module
  return ranked;
}