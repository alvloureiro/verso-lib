/**
 * Distance matrix service with optional caching.
 */

import type { Cache } from '../core/cache.interface'
import type {
	MapProvider,
	DistanceMatrixOptions,
} from '../core/provider.interface'
import type { DistanceMatrixResponse, LatLng } from '../core/types'

export interface DistanceServiceOptions {
	provider: MapProvider
	cache?: Cache
	cacheTtlSeconds?: number
}

function serializePoint(p: LatLng): string {
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
		origins: LatLng[],
		destinations: LatLng[],
		options?: DistanceMatrixOptions
	): Promise<DistanceMatrixResponse> {
		const cache = this.options.cache
		const cacheKey =
			`distance:${origins.map(serializePoint).join('|')}` +
			`->${destinations.map(serializePoint).join('|')}`
		if (cache && this.options.cacheTtlSeconds !== undefined) {
			const cached = await cache.get<DistanceMatrixResponse>(cacheKey)
			if (cached !== undefined) return cached
		}
		const result = await this.options.provider.getDistanceMatrix(
			origins,
			destinations,
			options
		)
		if (cache && this.options.cacheTtlSeconds !== undefined) {
			await cache.set(cacheKey, result, this.options.cacheTtlSeconds)
		}
		return result
	}
}
