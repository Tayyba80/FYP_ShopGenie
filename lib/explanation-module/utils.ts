// lib/explanationmodule/utils.ts
/**
 * Simple deterministic hash (djb2) for product IDs.
 * Used to seed a pseudo‑random pick from an array.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Pick a deterministic element from an array using a seed string.
 */
export function deterministicPick<T>(arr: T[], seed: string): T {
  if (arr.length === 0) throw new Error('Cannot pick from empty array');
  const index = hashString(seed) % arr.length;
  return arr[index];
}

/**
 * Run async tasks with a concurrency limit.
 */
export async function asyncPool<T>(
  concurrency: number,
  items: T[],
  iteratorFn: (item: T, index: number) => Promise<any>
): Promise<any[]> {
  const results: Promise<any>[] = [];
  const executing = new Set<Promise<any>>();
  for (const [i, item] of items.entries()) {
    const p = Promise.resolve().then(() => iteratorFn(item, i));
    results.push(p);
    if (concurrency <= items.length) {
      let e: Promise<any>;
      e = p.then(() => executing.delete(e));
      executing.add(e);
      if (executing.size >= concurrency) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}