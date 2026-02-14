/**
 * Routing (directions) service with optional caching.
 */

import type { Cache } from '../core/cache.interface'
import type { MapProvider, RouteOptions } from '../core/provider.interface'
import type { LatLng, RouteResult } from '../core/types'

export interface RouteServiceOptions {
	provider: MapProvider
	cache?: Cache
	cacheTtlSeconds?: number
}

function serializePoint(p: LatLng): string {
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
		origin: LatLng,
		destination: LatLng,
		waypoints?: LatLng[],
		options?: RouteOptions
	): Promise<RouteResult> {
		const cache = this.options.cache
		const cacheKey =
			`route:${serializePoint(origin)}->${serializePoint(destination)}` +
			(waypoints?.length ? `|${waypoints.map(serializePoint).join('|')}` : '')
		if (cache && this.options.cacheTtlSeconds !== undefined) {
			const cached = await cache.get<RouteResult>(cacheKey)
			if (cached !== undefined) return cached
		}
		const result = await this.options.provider.getRoute(
			origin,
			destination,
			waypoints,
			options
		)
		if (cache && this.options.cacheTtlSeconds !== undefined) {
			await cache.set(cacheKey, result, this.options.cacheTtlSeconds)
		}
		return result
	}
}
