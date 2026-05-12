import { Page, BrowserContext } from "playwright";
import { getBrowser, newContext } from "./browser";
import { withRetry } from "./retry";
import type { Product, Review } from "./product";
import { nanoid } from "nanoid";

const BASE_URL = "https://www.daraz.pk";
const MAX_PRODUCTS = 10;
const MAX_REVIEWS = 5;
const TIMEOUT = 30000;

export async function scrapeDaraz(
  query: string,
  category: string
): Promise<Product[]> {
  const browser = await getBrowser();
  const context = await newContext(browser);

  try {
    const listPage = await context.newPage();

    // Better anti-bot headers
    await listPage.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    await listPage.setViewportSize({
      width: 1366,
      height: 768,
    });

    const searchUrl = `${BASE_URL}/catalog/?q=${encodeURIComponent(query)}`;

    console.log("\n====================================");
    console.log("DARAZ SEARCH URL:", searchUrl);
    console.log("====================================\n");

    await withRetry(() =>
      listPage.goto(searchUrl, {
        waitUntil: "networkidle",
        timeout: TIMEOUT,
      })
    );

    // Human-like delay
    await listPage.waitForTimeout(2000 + Math.random() * 2000);

    // Scroll to trigger lazy loading
    await autoScroll(listPage);

    // Debugging info
    console.log("PAGE TITLE:", await listPage.title());

    await listPage.screenshot({
      path: "daraz-debug.png",
      fullPage: true,
    });

    const html = await listPage.content();
    console.log("\nHTML SAMPLE:\n");
    console.log(html.slice(0, 2000));

    // Wait for products
    await listPage
      .waitForSelector("[data-qa-locator='product-item']", {
        timeout: 15000,
      })
      .catch(() => {});

    const productCount = await listPage
      .locator("[data-qa-locator='product-item']")
      .count();

    console.log("\nDARAZ PRODUCT COUNT:", productCount);

    const listings = await listPage.evaluate((max) => {
      const items = document.querySelectorAll(
        "[data-qa-locator='product-item']"
      );

      const results: any[] = [];

      items.forEach((el) => {
        if (results.length >= max) return;

        // Better selectors
        const titleEl =
          el.querySelector("a[title]") ||
          el.querySelector("[title]");

        const priceEl =
          el.querySelector(".ooOxS") ||
          el.querySelector("[class*='price']");

        const originalPriceEl =
          el.querySelector("[class*='original']") ||
          el.querySelector("[class*='old']");

        const imgEl = el.querySelector("img") as HTMLImageElement | null;

        const linkEl = el.querySelector("a") as HTMLAnchorElement | null;

        const title =
          titleEl?.getAttribute("title")?.trim() ||
          titleEl?.textContent?.trim();

        if (!title) return;

        const priceText =
          priceEl?.textContent?.replace(/[^0-9]/g, "") ?? "";

        const price = priceText ? parseInt(priceText) : null;

        if (!price) return;

        const originalText =
          originalPriceEl?.textContent?.replace(/[^0-9]/g, "") ?? "";

        const originalPrice =
          originalText && originalText !== priceText
            ? parseInt(originalText)
            : undefined;

        // Ratings
        const ratingText =
          (
            el.querySelector("[class*='rating']")?.textContent || ""
          ).trim();

        const rating = ratingText
          ? parseFloat(ratingText.replace(/[^\d.]/g, ""))
          : 0;

        // Reviews
        const reviewText =
          (
            el.querySelector("[class*='review']")?.textContent || ""
          ).replace(/[^0-9]/g, "");

        const reviewCount = reviewText
          ? parseInt(reviewText)
          : 0;

        // Product URL
        const href = linkEl?.href ?? "";

        const productUrl = href.startsWith("http")
          ? href
          : `https://www.daraz.pk${href}`;

        // Image
        const imageUrl =
          imgEl?.src ||
          imgEl?.getAttribute("data-src") ||
          "";

        results.push({
          title,
          price,
          originalPrice,
          rating,
          reviewCount,
          imageUrl,
          productUrl,
        });
      });

      return results;
    }, MAX_PRODUCTS);

    console.log("\nSCRAPED PRODUCTS:", listings.length);

    await listPage.close();

    const products: Product[] = [];

    for (const listing of listings) {
      let reviews: Review[] = [];

      try {
        reviews = await scrapeDarazReviews(
          context,
          listing.productUrl
        );
      } catch (err) {
        console.error(
          "Review scrape failed:",
          listing.productUrl
        );
      }

      products.push({
        productId: `daraz_${nanoid(8)}`,
        platform: "Daraz",
        title: listing.title,
        productUrl: listing.productUrl,
        mainImageUrl: listing.imageUrl,
        category,
        price: {
          amount: listing.price,
          currency: "PKR",
          originalAmount: listing.originalPrice,
        },
        availability: "In Stock",
        rating: {
          average: listing.rating,
          count: listing.reviewCount,
        },
        reviews,
        timestamp: new Date().toISOString(),
      });
    }

    return products;
  } catch (error) {
    console.error("DARAZ SCRAPER ERROR:", error);
    return [];
  } finally {
    await context.close().catch(() => {});
  }
}

async function scrapeDarazReviews(
  context: BrowserContext,
  productUrl: string
): Promise<Review[]> {
  const page = await context.newPage();

  try {
    await withRetry(() =>
      page.goto(productUrl, {
        waitUntil: "networkidle",
        timeout: TIMEOUT,
      })
    );

    await page.waitForTimeout(1500);

    await autoScroll(page);

    const reviews = await page.evaluate((max) => {
      const selectors = [
        ".review-item",
        "[class*='review']",
        "[class*='Review']",
        "[data-spm='review']",
      ];

      let reviewElements: Element[] = [];

      for (const selector of selectors) {
        const found = document.querySelectorAll(selector);

        if (found.length > 0) {
          reviewElements = Array.from(found);
          break;
        }
      }

      const results: any[] = [];

      reviewElements.forEach((el) => {
        if (results.length >= max) return;

        const text =
          (
            el.querySelector("p")?.textContent ||
            el.textContent ||
            ""
          ).trim();

        if (!text || text.length < 5) return;

        const name =
          (
            el.querySelector("[class*='user']")?.textContent ||
            el.querySelector("[class*='name']")?.textContent ||
            ""
          ).trim();

        const date =
          (
            el.querySelector("time")?.textContent ||
            el.querySelector("[class*='date']")?.textContent ||
            ""
          ).trim();

        // Try multiple star systems
        const stars =
          el.querySelectorAll("[class*='star']").length ||
          el.querySelectorAll("[class*='Star']").length ||
          0;

        results.push({
          reviewerName: name || undefined,
          text,
          rating: Math.min(5, stars || 0),
          date: date || undefined,
        });
      });

      return results;
    }, MAX_REVIEWS);

    return reviews;
  } catch (error) {
    console.error("DARAZ REVIEW ERROR:", error);
    return [];
  } finally {
    await page.close().catch(() => {});
  }
}

async function autoScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 500;

      const timer = setInterval(() => {
        window.scrollBy(0, distance);

        totalHeight += distance;

        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 300);
    });
  });
}