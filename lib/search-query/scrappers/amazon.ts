// src/ai/retrieval/scrapers/amazon.ts
import { nanoid } from "nanoid";
import type { BrowserContext, Page } from "playwright";
import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import type { Product, Review } from "./product";
import { withRetry } from "./retry";

const BASE_URL     = "https://www.amazon.com";
const TIMEOUT      = 40000;
const MAX_PRODUCTS = 10;
const MAX_REVIEWS  = 5;

// Prices occasionally come through corrupted — cap at $10k for consumer electronics
function sanitizePrice(price: number): number {
  if (!price || price <= 0 || price > 10000) return 0;
  return Math.round(price * 100) / 100;
}

// Parse rating from specifications table when listing-level rating is missing
function parseRatingFromSpecs(specs?: Record<string, string>): number {
  if (!specs) return 0;
  const raw = specs["Customer Reviews"] ?? "";
  const match = raw.match(/([0-9.]+)\s+out of\s+5/);
  return match ? parseFloat(match[1]) : 0;
}

function parseReviewCountFromSpecs(specs?: Record<string, string>): number {
  if (!specs) return 0;
  const raw = specs["Customer Reviews"] ?? "";
  const match = raw.match(/\((\d[\d,]*)\)/);
  return match ? parseInt(match[1].replace(/,/g, "")) : 0;
}

// Strip JS-polluted fields from specifications
function cleanSpecifications(specs: Record<string, string>): Record<string, string> {
  const BLOCKLIST = ["Customer Reviews", "Best Sellers Rank"];
  return Object.fromEntries(
    Object.entries(specs).filter(([key, val]) =>
      !BLOCKLIST.includes(key) && !val.includes("function") && val.length < 200
    )
  );
}

async function createContext() {
  const { chromium } = await import("playwright");
  const dir = mkdtempSync(join(tmpdir(), "amz-ctx-"));

  const context = await chromium.launchPersistentContext(dir, {
    headless: true,
    viewport: { width: 1366, height: 768 },
    locale: "en-US",
    // Full Chrome UA — no "HeadlessChrome" string which Amazon detects
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",  // hides webdriver flag
      "--disable-infobars",
      "--window-size=1366,768",
      "--disable-dev-shm-usage",
    ],
    ignoreDefaultArgs: ["--enable-automation"],  // removes automation flag
  });

  // Mask webdriver property on every new page
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    (window as any).chrome = { runtime: {} };
  });

  return { context, dir };
}

async function extractSearchResults(page: Page, max: number) {
  return page.evaluate((limit: number) => {
    const results: any[] = [];
    const items = document.querySelectorAll("div[data-component-type='s-search-result']");

    for (const el of items) {
      if (results.length >= limit) break;

      const title =
        el.querySelector("h2 span")?.textContent?.trim() ||
        el.querySelector("h2 a span")?.textContent?.trim();

      const linkEl     = el.querySelector("h2 a") as HTMLAnchorElement;
      const productUrl = linkEl?.href;
      const img        = (el.querySelector("img") as HTMLImageElement)?.src;

      const priceText      = el.querySelector(".a-price .a-offscreen")?.textContent;
      const price          = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, "")) : null;
      const origText       = el.querySelector(".a-text-price .a-offscreen")?.textContent;
      const originalAmount = origText ? parseFloat(origText.replace(/[^0-9.]/g, "")) : undefined;

      const ratingText  = el.querySelector(".a-icon-alt")?.textContent || "";
      const ratingMatch = ratingText.match(/([0-9.]+)/);
      const reviewText  = el.querySelector(".a-size-small span")?.textContent || "";
      const reviewMatch = reviewText.replace(/,/g, "").match(/(\d+)/);

      const brand            = el.querySelector(".a-size-base-plus")?.textContent?.trim() || undefined;
      const estimatedDelivery = el.querySelector("[data-cy='delivery-recipe-content'] span")?.textContent?.trim() || undefined;

      if (!title || !productUrl) continue;

      results.push({
        asin: el.getAttribute("data-asin") || "",
        title, productUrl,
        imageUrl: img || "",
        price, originalAmount,
        rating:      ratingMatch ? parseFloat(ratingMatch[1]) : 0,
        reviewCount: reviewMatch ? parseInt(reviewMatch[1])   : 0,
        brand, estimatedDelivery,
      });
    }
    return results;
  }, max);
}

async function scrapeProductPage(context: BrowserContext, productUrl: string): Promise<{
  reviews: Review[];
  description?: string;
  keyFeatures?: string[];
  specifications?: Record<string, string>;
  brand?: string;
  availability?: string;
  pagePrice?: number;
  pageOriginalPrice?: number;
}> {
  const page = await context.newPage();
  try {
    await withRetry(() => page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: TIMEOUT }));
    await page.waitForSelector("#productTitle, #dp, .a-price", { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1000 + Math.random() * 500);

    // Scroll down to trigger lazy-loaded reviews
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);
    await page.waitForSelector("[data-hook='review'], #cm_cr-review_list", { timeout: 5000 }).catch(() => {});

    return await page.evaluate((maxR: number) => { // maxR is passed in below
      const brand        = (document.querySelector("#bylineInfo") as HTMLElement)?.textContent?.replace(/brand:|visit the|store/gi, "").trim() || undefined;
      const availability = (document.querySelector("#availability span") as HTMLElement)?.textContent?.trim() || "In Stock";
      const description  = (document.querySelector("#productDescription p, #bookDescription_feature_div") as HTMLElement)?.textContent?.trim() || undefined;

      // Extract price directly from product page as fallback
      const priceEl    = document.querySelector(".a-price .a-offscreen, #priceblock_ourprice, #priceblock_dealprice, .a-price[data-a-color='price'] .a-offscreen");
      const priceText  = priceEl?.textContent?.replace(/[^0-9.]/g, "") ?? "";
      const pagePrice  = priceText ? parseFloat(priceText) : undefined;
      const origEl     = document.querySelector(".a-text-price .a-offscreen");
      const origText   = origEl?.textContent?.replace(/[^0-9.]/g, "") ?? "";
      const pageOriginalPrice = origText ? parseFloat(origText) : undefined;

      const keyFeatures: string[] = [];
      document.querySelectorAll("#feature-bullets li span").forEach((el) => {
        const text = el.textContent?.trim();
        if (text && text.length > 5 && !text.toLowerCase().includes("make sure")) keyFeatures.push(text);
      });

      const specifications: Record<string, string> = {};
      document.querySelectorAll("#productDetails_techSpec_section_1 tr, #prodDetails tr").forEach((row) => {
        const cells = row.querySelectorAll("td, th");
        if (cells.length >= 2) {
          const key = cells[0].textContent?.trim() ?? "";
          const val = cells[1].textContent?.trim() ?? "";
          if (key && val) specifications[key] = val;
        }
      });

      // Try multiple review selectors — Amazon changes these frequently
      const reviewSelectors = [
        "[data-hook='review']",
        ".review",
        "[class*='review-item']",
        "#cm_cr-review_list .a-section",
      ];
      let reviewEls: NodeListOf<Element> | Element[] = [];
      for (const sel of reviewSelectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) { reviewEls = found; break; }
      }

      const reviews: any[] = [];
      reviewEls.forEach((el) => {
        if (reviews.length >= maxR) return;
        const text =
          el.querySelector("[data-hook='review-body'] span")?.textContent?.trim() ||
          el.querySelector(".review-text-content span")?.textContent?.trim() ||
          el.querySelector(".review-text")?.textContent?.trim();
        if (!text || text.length < 5) return;
        const ratingEl   = el.querySelector("[data-hook='review-star-rating'] .a-icon-alt, [data-hook='cmps-review-star-rating'] .a-icon-alt");
        const ratingText = ratingEl?.textContent ?? "";
        reviews.push({
          reviewerName: el.querySelector(".a-profile-name")?.textContent?.trim() || undefined,
          text,
          rating: Math.min(5, Math.max(0, parseFloat(ratingText.match(/[\d.]+/)?.[0] ?? "0"))),
          date:   el.querySelector("[data-hook='review-date']")?.textContent?.trim() || undefined,
        });
      });

      return {
        reviews,
        description,
        brand,
        availability,
        pagePrice,
        pageOriginalPrice,
        keyFeatures:    keyFeatures.length    > 0 ? keyFeatures    : undefined,
        specifications: Object.keys(specifications).length > 0 ? specifications : undefined,
      };
    }, MAX_REVIEWS);
  } catch {
    return { reviews: [] };
  } finally {
    await page.close();
  }
}

// ── Main export — returns Product[] matching product.ts exactly ───────────────
export async function scrapeAmazon(query: string, category: string): Promise<Product[]> {
  let context: BrowserContext | null = null;
  let dir: string | null = null;

  try {
    const session = await createContext();
    context = session.context;
    dir     = session.dir;

    const page = await context.newPage();

    const encodedQuery = encodeURIComponent(query.trim() || "product");
    const url          = `${BASE_URL}/s?k=${encodedQuery}`;

    console.log("Amazon URL:", url);

    // Extra headers to appear more like a real browser
    await page.setExtraHTTPHeaders({
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    });

    await withRetry(() => page.goto(url, { waitUntil: "networkidle", timeout: TIMEOUT }));

    // Human-like: small random pause then scroll before interacting
    await page.waitForTimeout(1500 + Math.random() * 1000);
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    const pageTitle = await page.title();
    console.log("Amazon page title:", pageTitle);

    // Detect CAPTCHA / robot check
    const isCaptcha = await page.evaluate(() =>
      document.body?.innerText?.toLowerCase().includes("captcha") ||
      document.body?.innerText?.toLowerCase().includes("robot check") ||
      document.title?.toLowerCase().includes("robot") ||
      !!document.querySelector("form[action*='validateCaptcha']")
    );
    if (isCaptcha) {
      console.warn("Amazon: CAPTCHA detected — returning empty");
      return [];
    }

    // Wait for product cards
    await page
      .waitForSelector("div[data-component-type='s-search-result']", { timeout: 12000 })
      .catch(() => console.warn("Amazon: result cards selector timed out"));

    let rawProducts = await extractSearchResults(page, MAX_PRODUCTS);

    if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
      console.warn("Amazon: main selector empty, trying /dp/ fallback");
      const snippet = await page.evaluate(() => document.body?.innerHTML?.slice(0, 800) ?? "");
      console.log("Amazon page snippet:", snippet);

      rawProducts = await page.evaluate(() => {
        const seen = new Set<string>();
        return Array.from(document.querySelectorAll("a[href*='/dp/']"))
          .filter((a) => {
            const text  = a.textContent?.trim() ?? "";
            const href  = (a as HTMLAnchorElement).href;
            const asin  = href.match(/\/dp\/([A-Z0-9]+)/)?.[1] ?? "";
            if (!asin || seen.has(asin) || text.length < 15) return false;
            seen.add(asin);
            return true;
          })
          .slice(0, 10)
          .map((a) => {
            const href  = (a as HTMLAnchorElement).href;
            const asin  = href.match(/\/dp\/([A-Z0-9]+)/)?.[1] ?? Math.random().toString(36).slice(2);
            // Try to find nearby image
            const img   = a.closest("[data-asin]")?.querySelector("img") as HTMLImageElement | null;
            return {
              asin,
              title:      a.textContent?.trim() || "Unknown product",
              productUrl: href,
              imageUrl:   img?.src ?? "",
              price: null, originalAmount: undefined,
              rating: 0, reviewCount: 0, brand: undefined, estimatedDelivery: undefined,
            };
          });
      });
    }

    await page.close();

    const products: Product[] = [];

    for (const p of (Array.isArray(rawProducts) ? rawProducts : []).filter((p) => p?.title && p?.productUrl).slice(0, MAX_PRODUCTS)) {
      const details = await scrapeProductPage(context, p.productUrl);

      products.push({
        productId:    `amazon_${p.asin || nanoid(6)}`,
        platform:     "Amazon",
        title:        p.title,
        productUrl:   p.productUrl,
        mainImageUrl: p.imageUrl || "",
        brand:        p.brand || details.brand,
        category:     category,
        description:  details.description,
        keyFeatures:  details.keyFeatures,
        price: {
          // Sanity check: Amazon prices are never > $10,000 for consumer electronics
          amount:         sanitizePrice((p.price && p.price > 0) ? p.price : (details.pagePrice ?? 0)),
          currency:       "USD",
          originalAmount: p.originalAmount ?? details.pageOriginalPrice,
        },
        availability:      details.availability ?? "In Stock",
        estimatedDelivery: p.estimatedDelivery,
        rating: {
          average: p.rating || parseRatingFromSpecs(details.specifications),
          count:   p.reviewCount || parseReviewCountFromSpecs(details.specifications),
        },
        reviews:        details.reviews,
        specifications: details.specifications ? cleanSpecifications(details.specifications) : undefined,
        timestamp:      new Date().toISOString(),
      });
    }

    console.log(`Amazon products scraped: ${products.length}`);
    return products;

  } catch (err: any) {
    console.error("[Amazon Error]", err);
    return [];
  } finally {
    if (context) await context.close().catch(() => {});
    if (dir)     rmSync(dir, { recursive: true, force: true });
  }
}