// scripts/download-models.ts
// to download model on production/ like run the download script in pkg.jsn during build so that model download and deployed into production
// check chat of deepseek for more details named Constraint Extractor
import { pipeline, env } from '@xenova/transformers';

async function download() {
  console.log('📦 Downloading ML models (this may take a few minutes)...');
  
  // Optional: set cache directory to a project-relative path for better control
  env.localModelPath = './models';
  
  // Feature extraction model (~420 MB)
  console.log('⏳ Feature extraction model (all-mpnet-base-v2)...');
  await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2', {
    progress_callback: (progress: any) => {
      if (progress.status === 'downloading') {
        console.log(`   ${progress.file}: ${Math.round(progress.progress || 0)}%`);
      }
    }
  });
  
  // NER model (~400 MB)
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