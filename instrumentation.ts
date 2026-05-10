// instrumentation.ts
import { setKnowledgeDb, getKnowledgeCache } from './lib/ranking/knowledgeCache';
import {prisma} from '@/lib/prisma';   // ← change to your actual path

export async function register() {
  // Must run only on the server (Node.js runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    setKnowledgeDb(prisma);
    await getKnowledgeCache().loadFromDb();
    console.log('✅ Knowledge cache preloaded from DB');
  }
}