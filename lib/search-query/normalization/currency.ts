import type { PriceRange, Product, SupportedCurrency } from "../types";

const EXCHANGE_RATES: Record<SupportedCurrency, Record<SupportedCurrency, number>> = {
  PKR: {
    PKR: 1,
    USD: 1 / 278,
  },
  USD: {
    PKR: 278,
    USD: 1,
  },
};

export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

export function convertPrice(
  amount: number,
  fromCurrency: SupportedCurrency,
  toCurrency: SupportedCurrency
): number {
  return roundPrice(amount * EXCHANGE_RATES[fromCurrency][toCurrency]);
}

export function convertPriceRange(
  range: PriceRange,
  toCurrency: SupportedCurrency
): PriceRange {
  return {
    min: range.min === null ? null : convertPrice(range.min, range.currency, toCurrency),
    max: range.max === null ? null : convertPrice(range.max, range.currency, toCurrency),
    currency: toCurrency,
  };
}

export function matchesPriceRange(
  amount: number,
  currency: SupportedCurrency,
  range: PriceRange
): boolean {
  const normalizedAmount =
    currency === range.currency
      ? amount
      : convertPrice(amount, currency, range.currency);

  if (range.min !== null && normalizedAmount < range.min) {
    return false;
  }

  if (range.max !== null && normalizedAmount > range.max) {
    return false;
  }

  return true;
}

export function normalizeCurrency(
  product: Product,
  targetCurrency: SupportedCurrency
): Product {
  if (product.currency === targetCurrency) {
    return product;
  }

  return {
    ...product,
    price: convertPrice(product.price, product.currency, targetCurrency),
    currency: targetCurrency,
  };
}
