/**
 * OSM (OSRM) provider: distance matrix via OSRM Table API.
 * Other MapProvider methods throw NotImplementedError (to be implemented later).
 * No API key required for public instance; baseUrl is configurable for self-hosted.
 */

import type { Cache } from '../../core/cache.interface'
import type {
	MapProvider,
	GeocodeOptions,
	ReverseGeocodeOptions,
	DistanceMatrixOptions,
	RouteOptions,
	AutocompleteOptions,
} from '../../core/provider.interface'
import type {
	LatLng,
	GeocodeResult,
	ReverseGeocodeResult,
	DistanceMatrixResponse,
	DistanceMatrixEntry,
	RouteResult,
	PlacePrediction,
} from '../../core/types'
import { HttpClient } from '../../http/http-client'
import { NoopCache } from '../../cache/noop.cache'
import { generateDistanceMatrixCacheKey } from '../../utils/cache-keys'
import {
	formatDistanceMeters,
	formatDurationSeconds,
} from '../../utils/format-distance-duration'

const DEFAULT_OSRM_BASE_URL = 'https://router.project-osrm.org'

export interface OsmProviderConfig {
	/** Optional API key (ignored for public OSRM; reserved for future auth). */
	apiKey?: string
	/** Optional base URL for self-hosted OSRM (default: public router.project-osrm.org). */
	baseUrl?: string
	/** Optional cache for distance matrix (7-day TTL). */
	cache?: Cache
	/** Optional HTTP client configuration. */
	httpConfig?: { timeout?: number; retries?: number }
}

/** OSRM Table API response. */
interface OsrmTableResponse {
	code: string
	message?: string
	durations?: (number | null)[][]
	distances?: (number | null)[][]
	sources?: unknown[]
	destinations?: unknown[]
}

/**
 * OSM provider using OSRM Table API for getDistanceMatrix only.
 * geocode, reverseGeocode, getRoute, and autocomplete throw NotImplementedError.
 */
export class OsmProvider implements MapProvider {
	private readonly httpClient: HttpClient
	private readonly cache: Cache
	private readonly baseUrl: string

	constructor(config: OsmProviderConfig = {}) {
		this.baseUrl = config.baseUrl ?? DEFAULT_OSRM_BASE_URL
		this.cache = config.cache ?? new NoopCache()
		this.httpClient = new HttpClient({
			baseURL: this.baseUrl,
			timeout: config.httpConfig?.timeout,
			maxRetries: config.httpConfig?.retries,
		})
	}

	async geocode(
		_address: string,
		_options?: GeocodeOptions
	): Promise<GeocodeResult[]> {
		throw new Error('NotImplemented: geocode')
	}

	async reverseGeocode(
		_lat: number,
		_lng: number,
		_options?: ReverseGeocodeOptions
	): Promise<ReverseGeocodeResult> {
		throw new Error('NotImplemented: reverseGeocode')
	}

	/**
	 * Get distance matrix via OSRM Table API. Uses cache (7-day TTL).
	 * Coordinates are sent as lng,lat (OSRM order). Origins first, then destinations.
	 */
	async getDistanceMatrix(
		origins: LatLng[],
		destinations: LatLng[],
		options?: DistanceMatrixOptions
	): Promise<DistanceMatrixResponse> {
		if (origins.length === 0 || destinations.length === 0) {
			return { origins, destinations, rows: [] }
		}

		const cacheKey = generateDistanceMatrixCacheKey(
			origins,
			destinations,
			options
		)
		const cached = await this.cache.get<DistanceMatrixResponse>(cacheKey)
		if (cached) return cached

		const profile = this.mapModeToOsrmProfile(options?.mode ?? 'driving')
		const allCoords = [...origins, ...destinations]
		const coordinates = allCoords.map((p) => `${p.lng},${p.lat}`).join(';')
		const sources = Array.from(
			{ length: origins.length },
			(_, i) => i
		).join(';')
		const destIndices = Array.from(
			{ length: destinations.length },
			(_, i) => origins.length + i
		).join(';')

		const params: Record<string, string> = {
			sources,
			destinations: destIndices,
			annotations: 'distance,duration',
		}

		const response = await this.httpClient.request<OsrmTableResponse>({
			url: `/table/v1/${profile}/${coordinates}`,
			method: 'GET',
			params,
		})

		if (response.code !== 'Ok') {
			throw new Error(
				`OSRM Table API error: ${response.code} - ${response.message ?? ''}`
			)
		}

		const result = this.parseOsrmTableResponse(
			response,
			origins,
			destinations
		)
		await this.cache.set(cacheKey, result, 7 * 24 * 60 * 60)
		return result
	}

	private mapModeToOsrmProfile(
		mode: DistanceMatrixOptions['mode']
	): string {
		switch (mode) {
			case 'walking':
				return 'foot'
			case 'bicycling':
				return 'bike'
			case 'transit':
				return 'car'
			default:
				return 'car'
		}
	}

	private parseOsrmTableResponse(
		response: OsrmTableResponse,
		origins: LatLng[],
		destinations: LatLng[]
	): DistanceMatrixResponse {
		const durations = response.durations ?? []
		const distances = response.distances ?? []
		const rows: DistanceMatrixEntry[][] = origins.map((_, i) =>
			destinations.map((_, j) => {
				const dur = durations[i]?.[j]
				const dist = distances[i]?.[j]
				const hasValue =
					typeof dur === 'number' && typeof dist === 'number'
				const status: DistanceMatrixEntry['status'] = hasValue
					? 'OK'
					: 'NOT_FOUND'
				const durationValue = typeof dur === 'number' ? dur : 0
				const distanceValue = typeof dist === 'number' ? dist : 0
				return {
					distance: {
						text: formatDistanceMeters(distanceValue),
						value: distanceValue,
					},
					duration: {
						text: formatDurationSeconds(durationValue),
						value: durationValue,
					},
					status,
				}
			})
		)
		return { origins, destinations, rows }
	}

	async getRoute(
		_origin: LatLng,
		_destination: LatLng,
		_waypoints?: LatLng[],
		_options?: RouteOptions
	): Promise<RouteResult> {
		throw new Error('NotImplemented: getRoute')
	}

	async autocomplete(
		_input: string,
		_options?: AutocompleteOptions
	): Promise<PlacePrediction[]> {
		throw new Error('NotImplemented: autocomplete')
	}
}
