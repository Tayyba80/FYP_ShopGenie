import type { Product } from "../types";

import { canonicalizeText } from "./cleanText";

function tokenizeTitle(title: string): Set<string> {
  return new Set(
    canonicalizeText(title)
      .split(" ")
      .filter((token) => token.length > 1)
  );
}

function titleSimilarity(a: string, b: string): number {
  const tokensA = tokenizeTitle(a);
  const tokensB = tokenizeTitle(b);

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
  const union = new Set([...tokensA, ...tokensB]).size;

  return union === 0 ? 0 : intersection / union;
}

function priceSimilarity(a: number, b: number): boolean {
  const baseline = Math.max(a, b);

  if (baseline === 0) {
    return true;
  }

  return Math.abs(a - b) / baseline <= 0.12;
}

function isDuplicateProduct(a: Product, b: Product): boolean {
  const similarity = titleSimilarity(a.title, b.title);
  const brandA = canonicalizeText(a.brand ?? "");
  const brandB = canonicalizeText(b.brand ?? "");
  const sameBrand = !brandA || !brandB || brandA === brandB;

  return similarity >= 0.72 && sameBrand && priceSimilarity(a.price, b.price);
}

function choosePreferredProduct(current: Product, candidate: Product): Product {
  const currentScore =
    (current.reviewCount ?? 0) * 2 +
    (current.rating ?? 0) * 10 +
    (current.imageUrl ? 5 : 0);
  const candidateScore =
    (candidate.reviewCount ?? 0) * 2 +
    (candidate.rating ?? 0) * 10 +
    (candidate.imageUrl ? 5 : 0);

  return candidateScore > currentScore ? candidate : current;
}

export function deduplicateProducts(
  products: Product[]
): Product[] {
  const unique: Product[] = [];

  for (const product of products) {
    const duplicateIndex = unique.findIndex((existing) =>
      isDuplicateProduct(existing, product)
    );

    if (duplicateIndex === -1) {
      unique.push(product);
      continue;
    }

    unique[duplicateIndex] = choosePreferredProduct(
      unique[duplicateIndex],
      product
    );
  }

  return unique;
}
