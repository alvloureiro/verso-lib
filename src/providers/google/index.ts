/**
 * Google Maps provider. Implements geocoding and other map APIs.
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
	Address,
	GeocodeResult,
	ReverseGeocodeResult,
	DistanceMatrixResponse,
	RouteResult,
	PlacePrediction,
} from '../../core/types'
import { HttpClient } from '../../http/http-client'
import { HttpError } from '../../http/types'

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

/** Response shape from Google Places Autocomplete API (place/autocomplete/json). */
interface GoogleAutocompleteResponse {
	status: string
	predictions: Array<{
		description: string
		place_id: string
		matched_substrings?: Array<{ length: number; offset: number }>
		structured_formatting?: {
			main_text: string
			main_text_matched_substrings?: Array<{ length: number; offset: number }>
			secondary_text: string
		}
	}>
	error_message?: string
}

/** Response shape from Google Geocoding API reverse (geocode/json with latlng). */
interface GoogleReverseGeocodeResponse {
	status: string
	results?: Array<{
		formatted_address: string
		place_id: string
		address_components: Array<{
			long_name: string
			short_name: string
			types: string[]
		}>
		geometry: {
			location: { lat: number; lng: number }
			location_type: string
		}
	}>
	error_message?: string
}

/** HTTP config for the Google provider. */
interface GoogleHttpConfig {
	timeout?: number
	retries?: number
	baseUrl?: string
}

/**
 * Google Maps provider. Used by createProvider/createMapClient
 * when provider is 'google'. Geocoding uses no cache (use GeocodingService);
 * reverse geocoding uses optional injected cache when provided.
 */
const DEFAULT_GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api'

export class GoogleMapsProvider implements MapProvider {
	private readonly apiKey: string
	private readonly httpClient: HttpClient
	private readonly cache: Cache | undefined

	constructor(apiKey: string, httpConfig?: GoogleHttpConfig)
	constructor(apiKey: string, cache: Cache, httpConfig?: GoogleHttpConfig)
	constructor(
		apiKey: string,
		cacheOrHttpConfig?: Cache | GoogleHttpConfig,
		httpConfig?: GoogleHttpConfig
	) {
		this.apiKey = apiKey
		const isCache = (x: unknown): x is Cache =>
			typeof x === 'object' &&
			x !== null &&
			'get' in x &&
			'set' in x &&
			typeof (x as Cache).get === 'function' &&
			typeof (x as Cache).set === 'function'
		if (cacheOrHttpConfig && isCache(cacheOrHttpConfig)) {
			this.cache = cacheOrHttpConfig
			httpConfig = httpConfig ?? {}
		} else {
			this.cache = undefined
			httpConfig = (cacheOrHttpConfig as GoogleHttpConfig) ?? {}
		}
		this.httpClient = new HttpClient({
			baseURL: httpConfig?.baseUrl ?? DEFAULT_GOOGLE_MAPS_BASE_URL,
			timeout: httpConfig?.timeout,
			maxRetries: httpConfig?.retries,
		})
	}

	/**
	 * Geocode an address via Google Geocoding API. Does not use cache; use
	 * GeocodingService for caching.
	 *
	 * @param address - Address string to geocode
	 * @param options - Optional region, language, bounds, or components
	 * @returns Resolved geocode results, or empty array on ZERO_RESULTS / 404
	 */
	async geocode(
		address: string,
		options?: GeocodeOptions
	): Promise<GeocodeResult[]> {
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
			return this.parseGeocodeResponse(response)
		} catch (err) {
			// Some proxies/routes return 404 for missing resource; treat as no results.
			if (err instanceof HttpError && err.status === 404) {
				return []
			}
			throw err
		}
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
		const location = result.geometry?.location
		if (!location || typeof result.place_id !== 'string') {
			throw new Error(
				'Geocoding API returned a malformed result ' +
					'(missing geometry.location or place_id)'
			)
		}
		const addressComponents = this.extractAddressComponents(
			result.address_components ?? []
		)
		return {
			coordinates: {
				lat: location.lat,
				lng: location.lng,
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

	/**
	 * Reverse geocode coordinates to a structured address. Uses optional cache
	 * when provided to minimize API calls (30-day TTL).
	 *
	 * @param lat - Latitude
	 * @param lng - Longitude
	 * @param options - Optional language, resultType, locationType
	 * @returns Reverse geocode result with address and location type
	 */
	async reverseGeocode(
		lat: number,
		lng: number,
		options?: ReverseGeocodeOptions
	): Promise<ReverseGeocodeResult> {
		const cacheKey = this.generateReverseGeocodeCacheKey(lat, lng, options)
		if (this.cache) {
			const cached = await this.cache.get<ReverseGeocodeResult>(cacheKey)
			if (cached) return cached
		}

		const params: Record<string, string> = {
			latlng: `${lat},${lng}`,
			key: this.apiKey,
		}
		if (options?.language) params.language = options.language
		if (options?.resultType?.length)
			params.result_type = options.resultType.join('|')
		if (options?.locationType?.length)
			params.location_type = options.locationType.join('|')

		try {
			const response =
				await this.httpClient.request<GoogleReverseGeocodeResponse>({
					url: '/geocode/json',
					method: 'GET',
					params,
				})
			const result = this.parseReverseGeocodeResponse(response, {
				lat,
				lng,
			})
			if (this.cache) {
				await this.cache.set(cacheKey, result, 30 * 24 * 60 * 60)
			}
			return result
		} catch (err) {
			if (err instanceof HttpError && err.status === 404) {
				throw new Error('No address found for the given coordinates')
			}
			throw err
		}
	}

	private generateReverseGeocodeCacheKey(
		lat: number,
		lng: number,
		options?: ReverseGeocodeOptions
	): string {
		const roundedLat = Math.round(lat * 1e5) / 1e5
		const roundedLng = Math.round(lng * 1e5) / 1e5
		const optionsString = options ? JSON.stringify(options) : ''
		return `reverse:${roundedLat},${roundedLng}:${optionsString}`
	}

	private parseReverseGeocodeResponse(
		response: GoogleReverseGeocodeResponse,
		inputCoords: { lat: number; lng: number }
	): ReverseGeocodeResult {
		if (response.status !== 'OK') {
			if (response.status === 'ZERO_RESULTS') {
				throw new Error('No address found for the given coordinates')
			}
			throw new Error(
				`Reverse geocoding API error: ${response.status} - ${response.error_message ?? ''}`
			)
		}
		if (!response.results?.length) {
			throw new Error('No address found for the given coordinates')
		}
		const first = response.results[0]
		const addressComponents = this.extractAddressComponents(
			first.address_components ?? []
		)
		return {
			address: {
				formattedAddress: first.formatted_address,
				...addressComponents,
				placeId: first.place_id,
			},
			coordinates: inputCoords,
			placeId: first.place_id,
			locationType: first.geometry?.location_type,
		}
	}

	/**
	 * Get place suggestions (autocomplete) for a partial address input.
	 * Uses Google Places Autocomplete API. Returns empty array on empty input
	 * or on API/network errors (no exceptions thrown).
	 *
	 * @param input - Partial input string (e.g., "Av. Paulista")
	 * @param options - Optional language, components, location, radius, types, sessionToken
	 * @returns Array of place predictions with description and placeId
	 */
	async autocomplete(
		input: string,
		options?: AutocompleteOptions
	): Promise<PlacePrediction[]> {
		if (!input || input.trim().length === 0) {
			return []
		}

		const params: Record<string, string> = {
			input: input.trim(),
			key: this.apiKey,
		}
		if (options?.language) params.language = options.language
		if (options?.sessionToken) params.sessiontoken = options.sessionToken
		if (options?.types) params.types = options.types
		if (options?.radius != null) params.radius = String(options.radius)
		if (options?.location) {
			params.location = `${options.location.lat},${options.location.lng}`
		}
		if (options?.components?.country) {
			const countries = Array.isArray(options.components.country)
				? options.components.country.join('|')
				: options.components.country
			params.components = `country:${countries}`
		}

		try {
			const response =
				await this.httpClient.request<GoogleAutocompleteResponse>({
					url: '/place/autocomplete/json',
					method: 'GET',
					params,
				})
			return this.parseAutocompleteResponse(response)
		} catch (error) {
			console.error('Autocomplete API error:', error)
			return []
		}
	}

	private parseAutocompleteResponse(
		response: GoogleAutocompleteResponse
	): PlacePrediction[] {
		if (response.status !== 'OK' && response.status !== 'ZERO_RESULTS') {
			console.warn(
				`Autocomplete API returned status: ${response.status}`,
				response.error_message
			)
			return []
		}
		if (!response.predictions || response.predictions.length === 0) {
			return []
		}
		return response.predictions.map((prediction) => ({
			description: prediction.description,
			placeId: prediction.place_id,
			matchedSubstrings: prediction.matched_substrings,
			structuredFormatting: prediction.structured_formatting
				? {
						mainText: prediction.structured_formatting.main_text,
						mainTextMatchedSubstrings:
							prediction.structured_formatting.main_text_matched_substrings ??
							[],
						secondaryText: prediction.structured_formatting.secondary_text,
					}
				: undefined,
		}))
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
