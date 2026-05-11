import { pipeline, env } from '@xenova/transformers';

async function downloadAll() {
  // This controls BOTH where models are saved and where they are loaded from later
  env.cacheDir = './models';
  // Optional: also set localModelPath for good measure (redundant but harmless)
  env.localModelPath = './models';
  env.allowRemoteModels = true;

  console.log('⏳ Downloading all models...');

  await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2');
  await pipeline('token-classification', 'Xenova/bert-base-NER');
  await pipeline('sentiment-analysis', 'Xenova/bert-base-multilingual-uncased-sentiment');
  await pipeline('feature-extraction', 'Xenova/multilingual-e5-small');

  console.log('✅ All models cached in ./models');
}

downloadAll().catch(console.error);