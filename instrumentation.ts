// instrumentation.ts
import { PrismaClient } from '@prisma/client';
import { setKnowledgeDb, getKnowledgeCache } from './lib/ranking/knowledgeCache';

const prisma = new PrismaClient();

export async function register() {
  // Only run once, even in dev with hot reload
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    setKnowledgeDb(prisma);
    await getKnowledgeCache().loadFromDb();
    console.log('✅ Knowledge cache preloaded');
  }
}