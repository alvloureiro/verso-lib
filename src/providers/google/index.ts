/**
 * Google Maps provider. Implements geocoding and other map APIs.
 */

import type {
	MapProvider,
	GeocodeOptions,
	DistanceMatrixOptions,
	RouteOptions,
} from '../../core/provider.interface'
import type {
	LatLng,
	Address,
	GeocodeResult,
	ReverseGeocodeResult,
	DistanceMatrixResponse,
	RouteResult,
} from '../../core/types'
import type { Cache } from '../../core/cache.interface'
import { HttpClient } from '../../http/http-client'
import { HttpError } from '../../http/types'
import { generateCacheKey } from '../../utils/cache-keys'

/** Response shape from Google Geocoding API (geocode/json). */
interface GoogleGeocodeResponse {
	status: string
	results?: Array<{
		formatted_address: string
		geometry: {
			location: { lat: number; lng: number }
			bounds?: {
				northeast: { lat: number; lng: number }
				southwest: { lat: number; lng: number }
			}
		}
		place_id: string
		address_components?: Array<{
			long_name: string
			short_name: string
			types: string[]
		}>
		partial_match?: boolean
	}>
	error_message?: string
}

/**
 * Google Maps provider. Used by createMapClient when provider is 'google'.
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
		const cacheKey = this.generateGeocodeCacheKey(address, options)
		const cached = await this.cache.get<GeocodeResult[]>(cacheKey)
		if (cached != null) {
			return cached
		}

		const params: Record<string, string> = {
			address: address,
			key: this.apiKey,
		}
		if (options?.region) params.region = options.region
		if (options?.language) params.language = options.language
		if (options?.bounds) {
			params.bounds =
				`${options.bounds.southwest.lat},${options.bounds.southwest.lng}|` +
				`${options.bounds.northeast.lat},${options.bounds.northeast.lng}`
		}
		if (options?.components) {
			params.components = Object.entries(options.components)
				.map(([key, value]) => `${key}:${value}`)
				.join('|')
		}

		try {
			const response = await this.httpClient.request<GoogleGeocodeResponse>({
				url: '/geocode/json',
				method: 'GET',
				params,
			})
			const results = this.parseGeocodeResponse(response)
			const ttlSeconds = 7 * 24 * 60 * 60
			await this.cache.set(cacheKey, results, ttlSeconds)
			return results
		} catch (err) {
			if (err instanceof HttpError && err.status === 404) {
				return []
			}
			throw err
		}
	}

	private generateGeocodeCacheKey(
		address: string,
		options?: GeocodeOptions
	): string {
		const normalizedAddress = address.toLowerCase().trim()
		return generateCacheKey('geocode', normalizedAddress, options ?? {})
	}

	private parseGeocodeResponse(
		response: GoogleGeocodeResponse
	): GeocodeResult[] {
		if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
			throw new Error(
				`Geocoding API error: ${response.status} - ${response.error_message ?? ''}`
			)
		}
		if (response.status === 'ZERO_RESULTS' || !response.results?.length) {
			return []
		}
		return response.results.map((result) =>
			this.mapGoogleResultToGeocodeResult(result)
		)
	}

	private mapGoogleResultToGeocodeResult(
		result: NonNullable<GoogleGeocodeResponse['results']>[number]
	): GeocodeResult {
		const addressComponents = this.extractAddressComponents(
			result.address_components ?? []
		)
		return {
			coordinates: {
				lat: result.geometry.location.lat,
				lng: result.geometry.location.lng,
			},
			address: {
				formattedAddress: result.formatted_address,
				...addressComponents,
				placeId: result.place_id,
			},
			placeId: result.place_id,
			bounds: result.geometry.bounds
				? {
						northeast: {
							lat: result.geometry.bounds.northeast.lat,
							lng: result.geometry.bounds.northeast.lng,
						},
						southwest: {
							lat: result.geometry.bounds.southwest.lat,
							lng: result.geometry.bounds.southwest.lng,
						},
					}
				: undefined,
			partialMatch: result.partial_match ?? false,
		}
	}

	private extractAddressComponents(
		components: Array<{
			long_name: string
			short_name: string
			types: string[]
		}>
	): Partial<Address> {
		const address: Partial<Address> = {}
		for (const component of components) {
			const types = component.types
			if (types.includes('street_number')) {
				address.number = component.long_name
			}
			if (types.includes('route')) {
				address.street = component.long_name
			}
			if (types.includes('sublocality') || types.includes('neighborhood')) {
				address.neighborhood = component.long_name
			}
			if (types.includes('administrative_area_level_2')) {
				address.city = component.long_name
			}
			if (types.includes('administrative_area_level_1')) {
				address.state = component.short_name
			}
			if (types.includes('country')) {
				address.country = component.long_name
			}
			if (types.includes('postal_code')) {
				address.postalCode = component.long_name
			}
		}
		return address
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
