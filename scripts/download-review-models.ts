// scripts/download-review-models.ts
import { pipeline, env } from '@xenova/transformers';

async function downloadModels() {
  console.log('📦 Downloading ReviewAnalyzer models...');

  // 1. Set cache directory
  // Use a relative path from the project root for consistent deployment
  env.localModelPath = './models';
  env.allowRemoteModels = true; // Fallback to Hugging Face if not cached

  // 2. Download Multilingual Sentiment Model
  // This is the ONNX version of the model, compatible with Transformers.js
  console.log('⏳ Multilingual sentiment model (Xenova/bert-base-multilingual-uncased-sentiment)...');
  await pipeline('sentiment-analysis', 'Xenova/bert-base-multilingual-uncased-sentiment', {
    progress_callback: (progress: any) => {
      if (progress.status === 'downloading') {
        console.log(`   ${progress.file}: ${Math.round(progress.progress || 0)}%`);
      }
    }
  });

  // 3. Download Multilingual Embedding Model
  console.log('⏳ Multilingual embedding model (Xenova/multilingual-e5-small)...');
  await pipeline('feature-extraction', 'Xenova/multilingual-e5-small', {
    progress_callback: (progress: any) => {
      if (progress.status === 'downloading') {
        console.log(`   ${progress.file}: ${Math.round(progress.progress || 0)}%`);
      }
    }
  });

  console.log('✅ All ReviewAnalyzer models cached successfully.');
}

downloadModels().catch(console.error);