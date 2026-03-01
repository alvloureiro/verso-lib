/**
 * Geocoding service: address → coordinates, with optional caching.
 * This is the only layer that caches; providers do not cache.
 */

import type { Cache } from '../core/cache.interface'
import type { MapProvider, GeocodeOptions } from '../core/provider.interface'
import type { GeocodeResult } from '../core/types'
import { generateGeocodeCacheKey } from '../utils/cache-keys'

export interface GeocodingServiceOptions {
	provider: MapProvider
	cache?: Cache
	cacheTtlSeconds?: number
}

/**
 * Geocoding service that delegates to a map provider and optionally caches.
 * Uses option-aware cache keys so the same address with different options
 * (e.g. region, language) does not collide.
 */
export class GeocodingService {
	constructor(private readonly options: GeocodingServiceOptions) {}

	/**
	 * Resolve an address to coordinates.
	 * @param address - Address or place query.
	 * @param options - Optional geocode options (region, language, bounds, skipCache).
	 * @returns Array of geocode results (empty if not found).
	 */
	async geocode(
		address: string,
		options?: GeocodeOptions
	): Promise<GeocodeResult[]> {
		const cache = this.options.cache
		const skipCache = options?.skipCache === true
		const cacheKey = generateGeocodeCacheKey(address, options)

		if (!skipCache && cache && this.options.cacheTtlSeconds !== undefined) {
			const cached = await cache.get<GeocodeResult[]>(cacheKey)
			if (cached !== undefined) return cached
		}

		const result = await this.options.provider.geocode(address, options)

		if (
			!skipCache &&
			cache &&
			result.length > 0 &&
			this.options.cacheTtlSeconds !== undefined
		) {
			await cache.set(cacheKey, result, this.options.cacheTtlSeconds)
		}
		return result
	}
}
