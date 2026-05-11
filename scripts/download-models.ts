import { pipeline, env } from '@xenova/transformers';

async function download() {
  console.log('📦 Downloading ML models (this may take a few minutes)...');
  
  env.localModelPath = './models';
  
  console.log('⏳ Feature extraction model (all-mpnet-base-v2)...');
  await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2', {
    progress_callback: (progress: any) => {
      if (progress.status === 'downloading') {
        console.log(`   ${progress.file}: ${Math.round(progress.progress || 0)}%`);
      }
    }
  });
  
  console.log('⏳ NER model (bert-base-NER)...');
  await pipeline('token-classification', 'Xenova/bert-base-NER', {
    progress_callback: (progress: any) => {
      if (progress.status === 'downloading') {
        console.log(`   ${progress.file}: ${Math.round(progress.progress || 0)}%`);
      }
    }
  });
  
  console.log('✅ All models cached successfully.');
}

download().catch(console.error);