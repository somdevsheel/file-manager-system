import { mmkv } from '@store/mmkvStorage';
import { FileCategory, FileEntry } from '@app-types/file';

const STORAGE_PREFIX = 'category-cache:';

export function categoryCacheKey(category: FileCategory, rootPath: string): string {
  return `${category}:${rootPath}`;
}

/**
 * Reads straight from MMKV rather than going through zustand's `persist` middleware — that
 * middleware always resolves hydration via `.then()`, which per JS semantics is deferred to a
 * microtask even for a synchronous storage backend like MMKV. That meant a component's very
 * first render (e.g. right after a cold app start) would always see an empty, not-yet-hydrated
 * cache. Reading MMKV directly is genuinely synchronous, so it's safe to call from a `useState`
 * lazy initializer on first render.
 */
export function getCachedCategoryEntries(key: string): FileEntry[] | undefined {
  const raw = mmkv.getString(STORAGE_PREFIX + key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as FileEntry[];
  } catch {
    return undefined;
  }
}

export function setCachedCategoryEntries(key: string, entries: FileEntry[]): void {
  mmkv.set(STORAGE_PREFIX + key, JSON.stringify(entries));
}
