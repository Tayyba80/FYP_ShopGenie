import type { PriceRange, SupportedCurrency } from "../types";

function detectCurrency(query: string): SupportedCurrency {
  return /\$|usd|dollar/.test(query) ? "USD" : "PKR";
}

function normalizePriceQuery(query: string): string {
  return query
    .replace(/,/g, "")
    .replace(/(\d+(?:\.\d+)?)\s*k\b/g, (_, value: string) => {
      return String(Math.round(parseFloat(value) * 1000));
    });
}

export function parsePriceRange(query: string): PriceRange {
  const normalized = normalizePriceQuery(query.toLowerCase());
  const currency = detectCurrency(normalized);

  let min: number | null = null;
  let max: number | null = null;

  const underMatch = normalized.match(
    /(?:under|less than|below|max|upto|up to)\s*(?:rs\.?|pkr|usd|\$)?\s*(\d+)/
  );
  if (underMatch) {
    max = Number.parseInt(underMatch[1], 10);
  }

  const overMatch = normalized.match(
    /(?:above|more than|over|minimum|min|at least|starting from)\s*(?:rs\.?|pkr|usd|\$)?\s*(\d+)/
  );
  if (overMatch) {
    min = Number.parseInt(overMatch[1], 10);
  }

  const rangeMatch = normalized.match(
    /(?:between\s+)?(?:rs\.?|pkr|usd|\$)?\s*(\d+)\s*(?:to|and|-)\s*(?:rs\.?|pkr|usd|\$)?\s*(\d+)/
  );
  if (rangeMatch) {
    min = Number.parseInt(rangeMatch[1], 10);
    max = Number.parseInt(rangeMatch[2], 10);
  }

  const aroundMatch = normalized.match(
    /(?:around|approximately|about|roughly)\s*(?:rs\.?|pkr|usd|\$)?\s*(\d+)/
  );
  if (aroundMatch) {
    const center = Number.parseInt(aroundMatch[1], 10);
    min = Math.round(center * 0.85);
    max = Math.round(center * 1.15);
  }

  return {
    min,
    max,
    currency,
  };
}
