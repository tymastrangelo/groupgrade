'use client';

type Subscriber<T> = (data: T) => void;

type CacheEntry<T> = {
  data?: T;
  etag?: string;
  ts: number;
  subscribers: Set<Subscriber<T>>;
  inflight?: Promise<T>;
};

const DEFAULT_TTL_MS = 2 * 60 * 1000; // 2 minutes

class TasksCache {
  private store = new Map<string, CacheEntry<any>>();

  private entry<T>(key: string): CacheEntry<T> {
    if (!this.store.has(key)) {
      this.store.set(key, { ts: 0, subscribers: new Set() });
    }
    return this.store.get(key) as CacheEntry<T>;
  }

  get<T>(key: string): { data?: T; etag?: string; ts: number } {
    const e = this.entry<T>(key);
    return { data: e.data, etag: e.etag, ts: e.ts };
    }

  subscribe<T>(key: string, cb: Subscriber<T>): () => void {
    const e = this.entry<T>(key);
    e.subscribers.add(cb as Subscriber<any>);
    // Push current data immediately if present
    if (e.data !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cb(e.data as any);
    }
    return () => {
      e.subscribers.delete(cb as Subscriber<any>);
    };
  }

  set<T>(key: string, data: T, etag?: string): void {
    const e = this.entry<T>(key);
    e.data = data;
    e.etag = etag;
    e.ts = Date.now();
    e.subscribers.forEach((cb) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cb(e.data as any);
      } catch {}
    });
  }

  mutate<T>(key: string, updater: (cur: T | undefined) => T): void {
    const e = this.entry<T>(key);
    const next = updater(e.data);
    this.set<T>(key, next, e.etag);
  }

  async fetch<T>(key: string, ttlMs = DEFAULT_TTL_MS): Promise<T | undefined> {
    const e = this.entry<T>(key);
    const now = Date.now();

    // Fresh data
    if (e.data !== undefined && now - e.ts < ttlMs) {
      return e.data;
    }

    // Deduplicate concurrent fetches
    if (e.inflight) {
      return e.inflight;
    }

    const controller = new AbortController();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (e.etag) headers['If-None-Match'] = e.etag;

    const inflight = fetch(key, { headers, signal: controller.signal })
      .then(async (res) => {
        if (res.status === 304) {
          // Not modified: just refresh timestamp
          e.ts = Date.now();
          return e.data;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch ${key}`);
        }
        const etag = res.headers.get('ETag') || undefined;
        const j = await res.json();
        const data = (j?.tasks as T) ?? (j as T);
        this.set<T>(key, data, etag);
        return data;
      })
      .finally(() => {
        e.inflight = undefined;
      });

    e.inflight = inflight as Promise<T>;
    return inflight as Promise<T>;
  }

  invalidate(key: string): void {
    const e = this.entry(key);
    e.ts = 0; // Expire the cache
    // Trigger a refetch for all subscribers
    this.fetch(key).catch(() => {});
  }
}

export const tasksCache = new TasksCache();
