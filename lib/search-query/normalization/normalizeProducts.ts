import type { Product, SupportedCurrency } from "../types";

import { cleanText } from "./cleanText";
import { normalizeCurrency } from "./currency";

export function normalizeProducts(
  products: Product[],
  targetCurrency?: SupportedCurrency
): Product[] {
  return products.map((product) => {
    const normalizedProduct = targetCurrency
      ? normalizeCurrency(product, targetCurrency)
      : product;

    return {
      ...normalizedProduct,
      productId: normalizedProduct.productId || normalizedProduct.id,
      platform: normalizedProduct.platform || normalizedProduct.source,
      title: cleanText(normalizedProduct.title),
      brand: normalizedProduct.brand
        ? cleanText(normalizedProduct.brand)
        : null,
      model: normalizedProduct.model
        ? cleanText(normalizedProduct.model)
        : null,
      category: normalizedProduct.category
        ? cleanText(normalizedProduct.category)
        : null,
      description: normalizedProduct.description
        ? cleanText(normalizedProduct.description)
        : null,
      keyFeatures: normalizedProduct.keyFeatures ?? [],
      imageUrl: normalizedProduct.imageUrl?.trim() || null,
      mainImageUrl:
        normalizedProduct.mainImageUrl?.trim() ||
        normalizedProduct.imageUrl?.trim() ||
        null,
      productUrl: normalizedProduct.productUrl.trim(),
      availability: normalizedProduct.availability ?? true,
      availabilityStatus: normalizedProduct.availabilityStatus ?? null,
      estimatedDelivery: normalizedProduct.estimatedDelivery
        ? cleanText(normalizedProduct.estimatedDelivery)
        : null,
      specs: normalizedProduct.specs || {},
      specifications: normalizedProduct.specifications || normalizedProduct.specs || {},
      reviews: (normalizedProduct.reviews ?? []).map((review) => ({
        reviewerName: review.reviewerName
          ? cleanText(review.reviewerName)
          : null,
        text: cleanText(review.text),
        rating: review.rating,
        date: review.date,
      })),
      priceDetails: normalizedProduct.priceDetails
        ? {
            ...normalizedProduct.priceDetails,
            amount: normalizedProduct.price,
            currency: normalizedProduct.currency,
          }
        : {
            amount: normalizedProduct.price,
            currency: normalizedProduct.currency,
            originalAmount: null,
            shippingCost: null,
          },
      ratingDetails: normalizedProduct.ratingDetails
        ? normalizedProduct.ratingDetails
        : {
            average: normalizedProduct.rating,
            count: normalizedProduct.reviewCount,
          },
      timestamp: normalizedProduct.timestamp || normalizedProduct.scrapedAt,
    };
  });
}
