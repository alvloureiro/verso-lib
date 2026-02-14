/**
 * Routing (directions) service with optional caching.
 */

import type { CacheInterface } from '../core/cache.interface'
import type { MapProvider } from '../core/provider.interface'
import type { LatLng, RouteResult } from '../core/types'

export interface RouteServiceOptions {
	provider: MapProvider
	cache?: CacheInterface
	cacheTtlSeconds?: number
}

function serializePoint(p: string | LatLng): string {
	if (typeof p === 'string') return p
	return `${p.lat},${p.lng}`
}

/**
 * Route service that delegates to a map provider and optionally caches.
 */
export class RouteService {
	constructor(private readonly options: RouteServiceOptions) {}

	/**
	 * Get route (directions) between origin and destination.
	 */
	async getRoute(
		origin: string | LatLng,
		destination: string | LatLng
	): Promise<RouteResult> {
		const cache = this.options.cache
		const cacheKey = `route:${serializePoint(origin)}->${serializePoint(destination)}`
		if (cache) {
			const cached = await cache.get<RouteResult>(cacheKey)
			if (cached !== undefined) return cached
		}
		const result = await this.options.provider.getRoute(origin, destination)
		if (cache && this.options.cacheTtlSeconds) {
			await cache.set(cacheKey, result, this.options.cacheTtlSeconds)
		}
		return result
	}
}
