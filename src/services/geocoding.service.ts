/**
 * Geocoding service: address → coordinates, with optional caching.
 */

import type { CacheInterface } from '../core/cache.interface'
import type { MapProvider } from '../core/provider.interface'
import type { GeocodingResult } from '../core/types'

export interface GeocodingServiceOptions {
	provider: MapProvider
	cache?: CacheInterface
	cacheTtlSeconds?: number
}

/**
 * Geocoding service that delegates to a map provider and optionally caches.
 */
export class GeocodingService {
	constructor(private readonly options: GeocodingServiceOptions) {}

	/**
	 * Resolve an address to coordinates.
	 * @param address - Address or place query.
	 * @returns Geocoding result or null.
	 */
	async geocode(address: string): Promise<GeocodingResult | null> {
		const cache = this.options.cache
		const cacheKey = `geocode:${address}`
		if (cache) {
			const cached = await cache.get<GeocodingResult>(cacheKey)
			if (cached !== undefined) return cached
		}
		const result = await this.options.provider.geocode(address)
		if (cache && result !== null && this.options.cacheTtlSeconds) {
			await cache.set(cacheKey, result, this.options.cacheTtlSeconds)
		}
		return result
	}
}
