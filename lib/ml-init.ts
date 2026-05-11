// src/lib/ml-init.ts
import { env } from '@xenova/transformers';

env.localModelPath = process.env.MODEL_PATH || './models';
env.allowRemoteModels = process.env.ALLOW_REMOTE_MODELS !== 'false';
// Optional: disable progress logs in production to keep output clean
// if (process.env.NODE_ENV === 'production') {
//   env.logLevel = 'none';
// }