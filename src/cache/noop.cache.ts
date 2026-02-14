/**
 * No-op cache: all operations are no-ops (cache disabled).
 */

import type { Cache } from '../core/cache.interface'

/**
 * Cache implementation that does nothing. Use when caching is disabled.
 */
export class NoopCache implements Cache {
	async get<T>(): Promise<T | undefined> {
		return undefined
	}

	async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
		void key
		void value
		void ttlSeconds
		// no-op
	}

	async del(): Promise<void> {
		// no-op
	}
}
