/**
 * No-op cache: all operations are no-ops (cache disabled).
 */

import type { CacheInterface } from '../core/cache.interface'

/**
 * Cache implementation that does nothing. Use when caching is disabled.
 */
export class NoopCache implements CacheInterface {
	async get<T>(): Promise<T | undefined> {
		return undefined
	}

	async set(): Promise<void> {
		// no-op
	}

	async del(): Promise<void> {
		// no-op
	}
}
