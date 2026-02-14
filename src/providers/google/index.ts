/**
 * Google Maps provider skeleton. Methods throw NotImplemented until API integration.
 */

import type {
	MapProvider,
	GeocodeOptions,
	DistanceMatrixOptions,
	RouteOptions,
} from '../../core/provider.interface'
import type {
	LatLng,
	GeocodeResult,
	ReverseGeocodeResult,
	DistanceMatrixResponse,
	RouteResult,
} from '../../core/types'
import type { Cache } from '../../core/cache.interface'
import { HttpClient } from '../../http/http-client'

/**
 * Google Maps provider. Skeleton implementation; all methods throw NotImplemented.
 * Used by createMapClient when provider is 'google'.
 */
export class GoogleMapsProvider implements MapProvider {
	private readonly apiKey: string
	/** Exposed for testing cache injection. */
	public readonly cache: Cache
	private readonly httpClient: HttpClient

	constructor(
		apiKey: string,
		cache: Cache,
		httpConfig?: { timeout?: number; retries?: number }
	) {
		this.apiKey = apiKey
		this.cache = cache
		this.httpClient = new HttpClient({
			baseURL: 'https://maps.googleapis.com/maps/api',
			timeout: httpConfig?.timeout,
			maxRetries: httpConfig?.retries,
		})
	}

	async geocode(
		address: string,
		options?: GeocodeOptions
	): Promise<GeocodeResult[]> {
		void address
		void options
		throw new Error('NotImplemented: geocode')
	}

	async reverseGeocode(
		lat: number,
		lng: number
	): Promise<ReverseGeocodeResult> {
		void lat
		void lng
		throw new Error('NotImplemented: reverseGeocode')
	}

	async getDistanceMatrix(
		origins: LatLng[],
		destinations: LatLng[],
		options?: DistanceMatrixOptions
	): Promise<DistanceMatrixResponse> {
		void origins
		void destinations
		void options
		throw new Error('NotImplemented: getDistanceMatrix')
	}

	async getRoute(
		origin: LatLng,
		destination: LatLng,
		waypoints?: LatLng[],
		options?: RouteOptions
	): Promise<RouteResult> {
		void origin
		void destination
		void waypoints
		void options
		throw new Error('NotImplemented: getRoute')
	}
}
