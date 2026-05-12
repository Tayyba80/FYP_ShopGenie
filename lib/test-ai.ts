// lib/test-ai.ts
import { getAIResponse } from './ai';

async function test() {
  const testQueries = [
    "Samsung headphones",
    "gaming laptop",
    "iPhone 14",
    "smartwatch",
  ];

  for (const q of testQueries) {
    console.log("\n" + "=".repeat(70));
    console.log(`Query: "${q}"`);
    console.log("=".repeat(70));

    const response = await getAIResponse([{ role: "user", content: q }]);

    if (typeof response === "string") {
      console.log("Response:", response);
    } else {
      console.log("✅ Got structured response!");
      console.log(response);
    }
  }
}

test().catch(console.error);