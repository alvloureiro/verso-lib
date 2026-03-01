/**
 * In-memory cache for development and testing.
 */

import type { Cache } from '../core/cache.interface'

interface Entry {
	value: unknown
	expiresAt?: number
}

/**
 * In-memory cache with TTL. Not suitable for production at scale.
 */
export class MemoryCache implements Cache {
	private readonly store = new Map<string, Entry>()

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
