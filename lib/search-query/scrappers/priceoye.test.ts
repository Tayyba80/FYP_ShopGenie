import { scrapePriceOye } from "./priceoye";

async function run() {
  const query = "iphone 14";

  console.log("\n==============================");
  console.log("PRICEOYE SCRAPER TEST");
  console.log("==============================");
  console.log("Query:", query);

  const products = await scrapePriceOye(query, "phone");

  console.log("\nRESULT COUNT:", products.length);

  console.log("\nSAMPLE OUTPUT:\n");

  console.dir(products.slice(0, 2), {
    depth: null,
  });

  if (!products.length) {
    console.log("❌ FAIL: No products returned");
  } else if (!products[0].productUrl) {
    console.log("❌ FAIL: Missing productUrl");
  } else {
    console.log("✅ PASS: PriceOye scraper working");
  }
}

run().catch(console.error);