import { CacheItem, ChatResponse } from '@/app/types';

const cache: Map<string, CacheItem> = new Map();
const CACHE_DURATION: number = 10 * 60 * 1000; //10 minutes

export function getFromCache(key: string): ChatResponse | null {
  const item: CacheItem | undefined = cache.get(key);
  
  if (!item) {
    return null;
  }
  
  //check if cache item has expired
  if (Date.now() - item.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
}

export function setToCache(key: string, value: ChatResponse): void {
  cache.set(key, {
    data: value,
    timestamp: Date.now()
  });
}

export function clearCache(): void {
  cache.clear();
}

export function getCacheSize(): number {
  return cache.size;
}