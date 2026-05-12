import * as cheerio from "cheerio";
import { getBrowser, newContext } from "./browser";
import { withRetry } from "./retry";
import type { Product, Review } from "./product";
import { nanoid } from "nanoid";

const BASE_URL = "https://priceoye.pk";
const MAX_PRODUCTS = 10;
const MAX_REVIEWS = 0; // intentionally disabled (PriceOye reviews are noisy)
const TIMEOUT = 20000;

/* =========================
   MAIN SCRAPER
========================= */

export async function scrapePriceOye(
  query: string,
  category: string
): Promise<Product[]> {
  const html = await withRetry(async () => {
    const res = await fetch(
      `${BASE_URL}/search?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!res.ok) throw new Error(`PriceOye HTTP ${res.status}`);
    return res.text();
  });

  const $ = cheerio.load(html);

  // =====================================================
  // STEP 1: ONLY COLLECT VALID PRODUCT LINKS
  // =====================================================
  const productLinks: string[] = [];

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";

    const url = href.startsWith("http")
      ? href
      : `${BASE_URL}${href}`;

    // must be product page
    if (!url.includes("/mobiles/")) return;

    // remove known non-product pages
    if (
      url.includes("/pricelist/") ||
      url.includes("/compare/") ||
      url.includes("?")
    )
      return;

    // strict product slug validation
    const slug = url.replace(BASE_URL, "");

    const looksValid =
      /iphone|galaxy|redmi|realme|oppo|vivo|infinix|tecno|honor|\d{2,}/i.test(
        slug
      );

    if (!looksValid) return;

    if (!productLinks.includes(url)) {
      productLinks.push(url);
    }
  });

  if (productLinks.length === 0) return [];

  const browser = await getBrowser();
  const context = await newContext(browser);

  const products: Product[] = [];

  try {
    for (const url of productLinks.slice(0, MAX_PRODUCTS)) {
      const product = await scrapeProductPage(context, url, category);
      if (product) products.push(product);
    }
  } finally {
    await context.close();
  }

  return products;
}

/* =========================
   PRODUCT PAGE (CLEAN ONLY)
========================= */

async function scrapeProductPage(
  context: any,
  url: string,
  category: string
): Promise<Product | null> {
  const page = await context.newPage();

  try {
    await withRetry(() =>
      page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUT,
      })
    );

    const html = await page.content();

    // ONLY RELIABLE SOURCE = META TAGS
    const $ = cheerio.load(html);

    const title =
      $('meta[property="og:title"]').attr("content") ||
      $("h1").first().text().trim();

    const imageUrl =
      $('meta[property="og:image"]').attr("content") || "";

    const description =
      $('meta[name="description"]').attr("content") || undefined;

    const priceMatch = html.match(/Rs\.?\s?([\d,]+)/i);
    const amount = priceMatch
      ? parseInt(priceMatch[1].replace(/,/g, ""))
      : null;

    // HARD VALIDATION (prevents category pages)
    if (!title || !amount || !url.includes("/mobiles/")) {
      return null;
    }

    return {
      productId: `priceoye_${nanoid(8)}`,
      platform: "PriceOye",
      title,
      productUrl: url,
      mainImageUrl: imageUrl,
      category,

      description,

      keyFeatures: [], // intentionally disabled (unreliable DOM data)
      specifications: undefined, // intentionally disabled (unstructured)

      price: {
        amount,
        currency: "PKR",
      },

      availability: "In Stock",

      rating: {
        average: 0,
        count: 0,
      },

      reviews: [], // disabled due to noise

      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  } finally {
    await page.close();
  }
}