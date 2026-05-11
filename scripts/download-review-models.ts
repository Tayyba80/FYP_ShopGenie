import { pipeline, env } from '@xenova/transformers';

async function downloadModels() {
  console.log('📦 Downloading ReviewAnalyzer models...');

  // Use a relative path from the project root for consistent deployment
  env.localModelPath = './models';
  env.allowRemoteModels = true; 

 
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