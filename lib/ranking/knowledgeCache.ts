// lib/ranking/knowledgeCache.ts
import { PrismaClient } from '@prisma/client';
import { Product } from '../../types/product';

let prisma: PrismaClient;

/** Call once at startup with your existing Prisma singleton */
export function setKnowledgeDb(prismaClient: PrismaClient) {
  prisma = prismaClient;
}

export class KnowledgeCache {
  private brands = new Set<string>();
  private features = new Set<string>();
  private loaded = false;

  /** Load all existing entries from Postgres (fast, indexed) */
  async loadFromDb(): Promise<void> {
    if (this.loaded || !prisma) return;

    const rows = await prisma.knowledgeCache.findMany({ select: { type: true, value: true } });
    for (const row of rows) {
      if (row.type === 'brand') this.brands.add(row.value);
      else if (row.type === 'feature') this.features.add(row.value);
    }
    this.loaded = true;
    console.log(`🧠 Loaded ${this.brands.size} brands, ${this.features.size} features from DB`);
  }

  /** Absorb new brands/features from a product batch */
  async learnFromProducts(products: Product[]): Promise<void> {
    if (!prisma) return;
    let changed = false;

    for (const p of products) {
      if (p.brand) {
        const b = p.brand.toLowerCase().trim();
        if (!this.brands.has(b)) {
          this.brands.add(b);
          changed = true;
          await this.persist('brand', b);
        }
      }
      if (p.keyFeatures) {
        for (const f of p.keyFeatures) {
          const feat = f.toLowerCase().trim();
          if (!this.features.has(feat)) {
            this.features.add(feat);
            changed = true;
            // fire‑and‑forget to keep request fast
            this.persist('feature', feat).catch(() => {});
          }
        }
      }
      if (p.specifications) {
        for (const [key, value] of Object.entries(p.specifications)) {
          const k = key.toLowerCase().trim();
          if (!this.features.has(k)) {
            this.features.add(k);
            changed = true;
            this.persist('feature', k).catch(() => {});
          }
          if (typeof value === 'string') {
            const v = value.toLowerCase().trim();
            if (!this.features.has(v)) {
              this.features.add(v);
              changed = true;
              this.persist('feature', v).catch(() => {});
            }
          }
        }
      }
    }

    if (changed) {
      console.debug(`🧠 Knowledge updated: ${this.brands.size} brands, ${this.features.size} features`);
    }
  }

  private async persist(type: string, value: string) {
    if (!prisma) return;
    try {
      await prisma.knowledgeCache.upsert({
        where: { key: `${type}:${value}` },
        update: { lastSeen: new Date() },
        create: { key: `${type}:${value}`, type, value },
      });
    } catch (err) {
      console.warn(`Failed to persist knowledge ${type}:${value}`, err);
    }
  }

  getBrands(): string[] { return Array.from(this.brands); }
  getFeatures(): string[] { return Array.from(this.features); }
}

// Singleton
let instance: KnowledgeCache | null = null;
export function getKnowledgeCache(): KnowledgeCache {
  if (!instance) instance = new KnowledgeCache();
  return instance;
}