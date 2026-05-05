// tests/mocks/productGenerator.ts

import { Product, Review } from '../../../types/product';

export interface MockProductOptions {
  platform: 'daraz' | 'temu';
  category: string;
  title: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  ratingAvg: number;
  ratingCount: number;
  keyFeatures?: string[];
  specifications?: Record<string, string>;
  reviews?: Review[];
  availability?: string;
}

export function createMockProduct(options: MockProductOptions): Product {
  const {
    platform,
    category,
    title,
    brand,
    price,
    originalPrice,
    ratingAvg,
    ratingCount,
    keyFeatures = [],
    specifications = {},
    reviews = [],
    availability = 'In Stock',
  } = options;

  return {
    productId: `${platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    platform,
    title,
    productUrl: `https://${platform}.com/product/${Math.random().toString(36)}`,
    mainImageUrl: `https://${platform}.com/images/${Math.random().toString(36)}.jpg`,
    brand,
    model: `${brand || 'Generic'}-${Math.floor(Math.random() * 1000)}`,
    category,
    description: `${title} - Best quality product from ${platform}.`,
    keyFeatures,
    price: {
      amount: price,
      currency: platform === 'daraz' ? 'PKR' : 'USD',
      originalAmount: originalPrice,
      shippingCost: platform === 'daraz' ? 200 : 5,
    },
    availability,
    estimatedDelivery: '3-7 days',
    rating: {
      average: ratingAvg,
      count: ratingCount,
    },
    reviews,
    specifications,
    timestamp: new Date().toISOString(),
  };
}

export function createMockReview(
  text: string,
  rating: number,
  reviewerName: string = 'Customer',
  date: string = new Date().toISOString()
): Review {
  return {
    reviewerName,
    text,
    rating,
    date,
  };
}

// Predefined review sets for common scenarios
export const reviewSets = {
  genuinePositive: (count: number): Review[] =>
    Array.from({ length: count }, (_, i) =>
      createMockReview(
        `Great product! ${['Works perfectly', 'Fast delivery', 'Exactly as described'][i % 3]}.`,
        5,
        `User${i + 1}`,
        new Date(Date.now() - i * 86400000).toISOString()
      )
    ),

  genuineMixed: (positive: number, negative: number): Review[] => [
    ...Array.from({ length: positive }, (_, i) =>
      createMockReview(
        `Good value for money. ${i % 2 ? 'Would recommend.' : 'Decent quality.'}`,
        4,
        `HappyCustomer${i}`,
        new Date(Date.now() - i * 86400000).toISOString()
      )
    ),
    ...Array.from({ length: negative }, (_, i) =>
      createMockReview(
        `Not great. ${i % 2 ? 'Stopped working after a week.' : 'Poor build quality.'}`,
        2,
        `UnhappyCustomer${i}`,
        new Date(Date.now() - (i + positive) * 86400000).toISOString()
      )
    ),
  ],

  spammyPositive: (count: number): Review[] =>
    Array.from({ length: count }, (_, i) =>
      createMockReview(
        'Good product',
        5,
        `User${(i % 3) + 1}`,
        new Date(Date.now() - i * 3600000).toISOString()
      )
    ),

  romanUrduReviews: (): Review[] => [
    createMockReview('Bohot acha product hai. Delivery time per hui.', 5, 'Ali', '2024-01-15'),
    createMockReview('Kharab quality. Paisa waste ho gaya.', 1, 'Sara', '2024-02-10'),
    createMockReview('Theek hai, kaam chala leta hai.', 3, 'Omar', '2024-03-01'),
  ],
};