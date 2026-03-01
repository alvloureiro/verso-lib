/**
 * In-memory cache for development and testing.
 */

import type { Cache } from '../core/cache.interface'

interface Entry {
	value: unknown
	expiresAt?: number
}

export interface MemoryCacheOptions {
	/**
	 * Maximum number of entries to keep. When exceeded, oldest entries
	 * (by insertion order) are evicted on the next set. Omitted = unbounded.
	 */
	maxSize?: number
}

/**
 * In-memory cache with TTL. Supports optional max-size eviction (oldest first).
 * Not suitable for production at scale.
 */
export class MemoryCache implements Cache {
	private readonly store = new Map<string, Entry>()
	private readonly maxSize: number | undefined

	constructor(options?: MemoryCacheOptions) {
		this.maxSize =
			options?.maxSize !== undefined && options.maxSize > 0
				? options.maxSize
				: undefined
	}

	async get<T>(key: string): Promise<T | undefined> {
		const entry = this.store.get(key)
		if (!entry) return undefined
		if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
			this.store.delete(key)
			return undefined
		}
		return entry.value as T
	}

	async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
		const expiresAt =
			ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined
		this.store.set(key, { value, expiresAt })
		this.evictIfOverCapacity()
	}

	private evictIfOverCapacity(): void {
		if (this.maxSize === undefined) return
		let toRemove = this.store.size - this.maxSize
		if (toRemove <= 0) return
		for (const key of this.store.keys()) {
			if (toRemove <= 0) break
			this.store.delete(key)
			toRemove--
		}
	}

	async del(key: string): Promise<void> {
		this.store.delete(key)
	}

	async has(key: string): Promise<boolean> {
		const entry = this.store.get(key)
		if (!entry) return false
		if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
			this.store.delete(key)
			return false
		}
		return true
	}

	/** Clear all entries. Useful in tests. */
	clear(): void {
		this.store.clear()
	}
}
