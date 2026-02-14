/**
 * Distance matrix service with optional caching.
 */

import type { CacheInterface } from '../core/cache.interface'
import type { MapProvider } from '../core/provider.interface'
import type { DistanceMatrixResult, LatLng } from '../core/types'

export interface DistanceServiceOptions {
	provider: MapProvider
	cache?: CacheInterface
	cacheTtlSeconds?: number
}

function serializePoint(p: string | LatLng): string {
	if (typeof p === 'string') return p
	return `${p.lat},${p.lng}`
}

/**
 * Distance matrix service that delegates to a map provider and optionally caches.
 */
export class DistanceService {
	constructor(private readonly options: DistanceServiceOptions) {}

	/**
	 * Get distance/duration matrix between origins and destinations.
	 */
	async getDistanceMatrix(
		origins: (string | LatLng)[],
		destinations: (string | LatLng)[]
	): Promise<DistanceMatrixResult> {
		const cache = this.options.cache
		const cacheKey =
			`distance:${origins.map(serializePoint).join('|')}` +
			`->${destinations.map(serializePoint).join('|')}`
		if (cache) {
			const cached = await cache.get<DistanceMatrixResult>(cacheKey)
			if (cached !== undefined) return cached
		}
		const result = await this.options.provider.getDistanceMatrix(
			origins,
			destinations
		)
		if (cache && this.options.cacheTtlSeconds) {
			await cache.set(cacheKey, result, this.options.cacheTtlSeconds)
		}
		return result
	}
}
