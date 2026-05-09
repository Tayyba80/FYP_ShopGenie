// // backend/explanation-module/config.ts

// export interface ConfigOptions {
//   priceThreshold: number;
//   ratingThreshold: number;
//   sentimentThreshold: number;
//   featureThreshold: number;
//   trustThreshold: number;
//   useLLM: boolean;
//   groqApiKey: string;
//   llmModel: string;
//   llmTemperature: number;
//   llmMaxTokens: number;
//   maxMatchingFeatures: number;
//   maxBulletPoints: number;
//   platformConfig: Record<string, { name: string; icon: string; color?: string }>;
//   currencySymbols: Record<string, string>;
// }

// export const defaultConfig: ConfigOptions = {
//   priceThreshold: 0.70,
//   ratingThreshold: 0.70,
//   sentimentThreshold: 0.70,
//   featureThreshold: 0.70,
//   trustThreshold: 0.80,
//   useLLM: process.env.USE_LLM === 'true',
//   groqApiKey: process.env.GROQ_API_KEY || '',
//   llmModel: 'llama-3.3-70b-versatile',
//   llmTemperature: 0.3,
//   llmMaxTokens: 200,
//   maxMatchingFeatures: 3,
//   maxBulletPoints: 5,
//   platformConfig: {
//     daraz: { name: 'Daraz', icon: '🛍️', color: 'orange' },
//     temu: { name: 'Temu', icon: '🎯', color: 'purple' },
//     amazon: { name: 'Amazon', icon: '📦', color: 'yellow' },
//     shopee: { name: 'Shopee', icon: '🛒', color: 'orange' },
//     alibaba: { name: 'Alibaba', icon: '🏭', color: 'red' },
//   },
//   currencySymbols: {
//     USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹', BDT: '৳', CAD: 'C$', AUD: 'A$',
//   },
// };

// export let config: ConfigOptions = { ...defaultConfig };

// export function updateConfig(newConfig: Partial<ConfigOptions>) {
//   config = { ...config, ...newConfig };
// }
// backend/explanation-module/config.ts
// backend/explanation-module/config.ts
import dotenv from 'dotenv';
import path from 'path';

// Load .env from parent folder (backend/)
dotenv.config({ path: path.join(__dirname, '../.env') });

export interface ConfigOptions {
  priceThreshold: number;
  ratingThreshold: number;
  sentimentThreshold: number;
  featureThreshold: number;
  trustThreshold: number;
  useLLM: boolean;
  groqApiKey: string;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
  maxMatchingFeatures: number;
  maxBulletPoints: number;
  platformConfig: Record<string, { name: string; icon: string; color?: string }>;
  currencySymbols: Record<string, string>;
}

export const defaultConfig: ConfigOptions = {
  priceThreshold: 0.70,
  ratingThreshold: 0.70,
  sentimentThreshold: 0.70,
  featureThreshold: 0.70,
  trustThreshold: 0.80,
  useLLM: process.env.USE_LLM === 'true',
  groqApiKey: process.env.GROQ_API_KEY || '',
  llmModel: 'llama-3.3-70b-versatile',
  llmTemperature: 0.3,
  llmMaxTokens: 200,
  maxMatchingFeatures: 3,
  maxBulletPoints: 5,
  platformConfig: {
    daraz: { name: 'Daraz', icon: '🛍️', color: 'orange' },
    temu: { name: 'Temu', icon: '🎯', color: 'purple' },
    amazon: { name: 'Amazon', icon: '📦', color: 'yellow' },
    shopee: { name: 'Shopee', icon: '🛒', color: 'orange' },
    alibaba: { name: 'Alibaba', icon: '🏭', color: 'red' },
  },
  currencySymbols: {
    USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹', BDT: '৳', CAD: 'C$', AUD: 'A$',
  },
};

// Mutable config object that can be updated at runtime
export let config: ConfigOptions = { ...defaultConfig };

export function updateConfig(newConfig: Partial<ConfigOptions>) {
  config = { ...config, ...newConfig };
}