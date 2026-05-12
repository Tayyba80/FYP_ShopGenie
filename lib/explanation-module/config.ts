// lib/explanationmodule/config.ts
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local from project root BEFORE any other code reads process.env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

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
  llmTimeoutMs: number;
  llmMaxRetries: number;
  llmConcurrency: number;
}

function readEnvBool(key: string, defaultValue: boolean): boolean {
  const val = process.env[key];
  if (val === undefined) return defaultValue;
  return val === 'true' || val === '1';
}

export const config: ConfigOptions = {
  priceThreshold: 0.70,
  ratingThreshold: 0.70,
  sentimentThreshold: 0.70,
  featureThreshold: 0.70,
  trustThreshold: 0.80,
  useLLM: readEnvBool('USE_LLM', false),
  groqApiKey: process.env.GROQ_API_KEY || '',
  llmModel: process.env.LLM_MODEL || 'llama-3.3-70b-versatile',
  llmTemperature: parseFloat(process.env.LLM_TEMPERATURE || '0.3'),
  llmMaxTokens: parseInt(process.env.LLM_MAX_TOKENS || '200', 10),
  maxMatchingFeatures: 3,
  maxBulletPoints: 5,
  platformConfig: {
    daraz: { name: 'Daraz', icon: '🛍️', color: 'orange' },
    temu: { name: 'Temu', icon: '🎯', color: 'purple' },
    amazon: { name: 'Amazon', icon: '📦', color: 'yellow' },
  },
  currencySymbols: {
    USD: '$', EUR: '€', GBP: '£', PKR: '₨', INR: '₹', BDT: '৳', CAD: 'C$', AUD: 'A$',
  },
  // New production options
  llmTimeoutMs: 5000,        // 5 seconds
  llmMaxRetries: 2,
  llmConcurrency: 3,         // max concurrent Groq requests
};

// Freeze to prevent accidental mutations (optional)
// Object.freeze(config);