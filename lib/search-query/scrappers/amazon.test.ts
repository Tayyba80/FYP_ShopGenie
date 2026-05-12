import { scrapeAmazon } from "./amazon";

async function run() {
  const query = "gaming laptop";

  console.log("\n==============================");
  console.log("AMAZON SCRAPER TEST");
  console.log("==============================");
  console.log("Query:", query);

  const products = await scrapeAmazon(query, "laptop");

  console.log("\nRESULT COUNT:", products.length);

  console.log("\nSAMPLE OUTPUT:\n");

  console.dir(products.slice(0, 2), {
    depth: null,
  });

  // basic sanity checks
  if (!products.length) {
    console.log("❌ FAIL: No products returned");
  } else if (!products[0].title || !products[0].price) {
    console.log("❌ FAIL: Invalid product structure");
  } else {
    console.log("✅ PASS: Amazon scraper working");
  }
}

run().catch(console.error);