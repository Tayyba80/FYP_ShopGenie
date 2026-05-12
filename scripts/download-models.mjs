// scripts/download-models.mjs
import { pipeline, env } from '@xenova/transformers';

env.cacheDir = './models';
env.allowRemoteModels = true;

console.log('⏳ Downloading models...');
await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2');
await pipeline('token-classification', 'Xenova/bert-base-NER');
await pipeline('sentiment-analysis', 'Xenova/bert-base-multilingual-uncased-sentiment');
await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');
console.log('✅ Done.');