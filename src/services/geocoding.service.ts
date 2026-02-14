/**
 * Geocoding service: address → coordinates, with optional caching.
 */

import type { Cache } from '../core/cache.interface'
import type { MapProvider } from '../core/provider.interface'
import type { GeocodeResult } from '../core/types'

export interface GeocodingServiceOptions {
	provider: MapProvider
	cache?: Cache
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
	 * @returns Array of geocode results (empty if not found).
	 */
	async geocode(address: string): Promise<GeocodeResult[]> {
		const cache = this.options.cache
		const cacheKey = `geocode:${address}`
		if (cache && this.options.cacheTtlSeconds !== undefined) {
			const cached = await cache.get<GeocodeResult[]>(cacheKey)
			if (cached !== undefined) return cached
		}
		const result = await this.options.provider.geocode(address)
		if (
			cache &&
			result.length > 0 &&
			this.options.cacheTtlSeconds !== undefined
		) {
			await cache.set(cacheKey, result, this.options.cacheTtlSeconds)
		}
		return result
	}
}
