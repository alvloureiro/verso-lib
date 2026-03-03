/**
 * OpenStreetMap (Nominatim) provider: geocoding, reverse geocoding, and
 * autocomplete via Nominatim API. Uses HttpClient and optional cache.
 * No API key required; User-Agent (and optionally email) recommended per usage policy.
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
	Address,
	GeocodeResult,
	ReverseGeocodeResult,
	DistanceMatrixResponse,
	RouteResult,
	PlacePrediction,
	LatLng,
	Bounds,
} from '../../core/types'
import { HttpClient } from '../../http/http-client'
import { NoopCache } from '../../cache/noop.cache'
import type { NominatimPlace } from './types'

const DEFAULT_NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const DEFAULT_USER_AGENT =
	'verso-lib/1.0 (https://github.com/alvloureiro/verso-lib)'

export interface OpenStreetMapProviderConfig {
	/** Required: identify your application (Nominatim usage policy). */
	userAgent: string
	/** Optional: recommended for heavy use. */
	email?: string
	baseUrl?: string
	cache?: Cache
	httpConfig?: { timeout?: number; retries?: number }
}

/**
 * OpenStreetMap provider using Nominatim for geocode, reverseGeocode, and
 * autocomplete. getDistanceMatrix and getRoute are stubs.
 */
export class OpenStreetMapProvider implements MapProvider {
	private readonly httpClient: HttpClient
	private readonly cache: Cache
	private readonly baseUrl: string

	constructor(config: OpenStreetMapProviderConfig) {
		this.cache = config.cache ?? new NoopCache()
		this.baseUrl = config.baseUrl ?? DEFAULT_NOMINATIM_BASE
		const headers: Record<string, string> = {
			'User-Agent': config.userAgent || DEFAULT_USER_AGENT,
		}
		this.httpClient = new HttpClient({
			baseURL: this.baseUrl,
			headers,
			timeout: config.httpConfig?.timeout,
			maxRetries: config.httpConfig?.retries,
		})
	}

	async geocode(
		address: string,
		options?: GeocodeOptions
	): Promise<GeocodeResult[]> {
		if (!address.trim()) return []

		const cacheKey = `nominatim:geocode:${address}:${JSON.stringify(options ?? {})}`
		const cached = await this.cache.get<GeocodeResult[]>(cacheKey)
		if (cached) return cached

		const params = this.buildSearchParams({
			language: options?.language,
			country: options?.components?.country,
			limit: 5,
		})
		params.q = address.trim()
		if (options?.location) {
			params.viewbox = [
				options.location.lng - 0.1,
				options.location.lat - 0.1,
				options.location.lng + 0.1,
				options.location.lat + 0.1,
			].join(',')
		}

		try {
			const response = await this.httpClient.request<NominatimPlace[]>({
				url: '/search',
				method: 'GET',
				params,
			})
			const list = Array.isArray(response) ? response : []
			const results = list.map((p) => this.nominatimPlaceToGeocodeResult(p))
			await this.cache.set(cacheKey, results, 7 * 24 * 60 * 60)
			return results
		} catch (error) {
			console.error('Nominatim geocoding error:', error)
			return []
		}
	}

	async reverseGeocode(
		lat: number,
		lng: number,
		options?: ReverseGeocodeOptions
	): Promise<ReverseGeocodeResult> {
		const cacheKey = `nominatim:reverse:${lat},${lng}:${JSON.stringify(options ?? {})}`
		const cached = await this.cache.get<ReverseGeocodeResult>(cacheKey)
		if (cached) return cached

		const params = this.buildReverseParams({
			language: options?.language,
		})
		params.lat = String(lat)
		params.lon = String(lng)

		try {
			const response = await this.httpClient.request<NominatimPlace>({
				url: '/reverse',
				method: 'GET',
				params,
			})
			if (!response || typeof response !== 'object') {
				throw new Error('No address found for the given coordinates')
			}
			const result = this.nominatimPlaceToReverseResult(response, lat, lng)
			await this.cache.set(cacheKey, result, 30 * 24 * 60 * 60)
			return result
		} catch (error) {
			console.error('Nominatim reverse geocoding error:', error)
			throw error
		}
	}

	async autocomplete(
		input: string,
		options?: AutocompleteOptions
	): Promise<PlacePrediction[]> {
		if (!input.trim()) return []

		const params = this.buildSearchParams({
			language: options?.language,
			country: options?.components?.country,
			limit: 5,
		})
		params.q = input.trim()
		if (options?.location) {
			params.viewbox = [
				options.location.lng - 0.1,
				options.location.lat - 0.1,
				options.location.lng + 0.1,
				options.location.lat + 0.1,
			].join(',')
		}

		try {
			const response = await this.httpClient.request<NominatimPlace[]>({
				url: '/search',
				method: 'GET',
				params,
			})
			const list = Array.isArray(response) ? response : []
			return list.map((p) => this.nominatimPlaceToPlacePrediction(p))
		} catch (error) {
			console.error('Nominatim autocomplete error:', error)
			return []
		}
	}

	async getDistanceMatrix(
		origins: LatLng[],
		destinations: LatLng[],
		options?: DistanceMatrixOptions
	): Promise<DistanceMatrixResponse> {
		void options
		const rows = origins.map(() =>
			destinations.map(() => ({
				distance: { text: '0 km', value: 0 },
				duration: { text: '0 mins', value: 0 },
				status: 'ZERO_RESULTS' as const,
			}))
		)
		return { origins, destinations, rows }
	}

	async getRoute(
		origin: LatLng,
		destination: LatLng,
		waypoints?: LatLng[],
		options?: RouteOptions
	): Promise<RouteResult> {
		void waypoints
		void options
		const bounds: Bounds = {
			northeast: {
				lat: Math.max(origin.lat, destination.lat),
				lng: Math.max(origin.lng, destination.lng),
			},
			southwest: {
				lat: Math.min(origin.lat, destination.lat),
				lng: Math.min(origin.lng, destination.lng),
			},
		}
		return {
			summary: '',
			distance: { text: '0 km', value: 0 },
			duration: { text: '0 mins', value: 0 },
			polyline: '',
			steps: [],
			bounds,
		}
	}

	private buildSearchParams(options?: {
		language?: string
		country?: string | string[]
		limit?: number
	}): Record<string, string> {
		const params: Record<string, string> = {
			format: 'jsonv2',
			addressdetails: '1',
			limit: String(options?.limit ?? 5),
		}
		if (options?.language) {
			params['accept-language'] = options.language
		}
		if (options?.country) {
			const codes = Array.isArray(options.country)
				? options.country.join(',')
				: options.country
			params.countrycodes = codes.toLowerCase().replace(/\s/g, '')
		}
		return params
	}

	private buildReverseParams(options?: {
		language?: string
	}): Record<string, string> {
		const params: Record<string, string> = {
			format: 'jsonv2',
			addressdetails: '1',
		}
		if (options?.language) {
			params['accept-language'] = options.language
		}
		return params
	}

	private nominatimPlaceToGeocodeResult(place: NominatimPlace): GeocodeResult {
		const address = this.extractAddressComponents(place)
		const lat = parseFloat(place.lat)
		const lon = parseFloat(place.lon)
		return {
			coordinates: { lat, lng: lon },
			address: {
				formattedAddress: place.display_name,
				...address,
				placeId: String(place.place_id),
			},
			placeId: String(place.place_id),
			bounds: this.parseBoundingBox(place.boundingbox),
			partialMatch: false,
		}
	}

	private parseBoundingBox(
		bbox?: [string, string, string, string]
	): Bounds | undefined {
		if (!bbox || bbox.length !== 4) return undefined
		const [minLat, maxLat, minLon, maxLon] = bbox.map(parseFloat)
		return {
			southwest: { lat: minLat, lng: minLon },
			northeast: { lat: maxLat, lng: maxLon },
		}
	}

	private extractAddressComponents(place: NominatimPlace): Partial<Address> {
		const a: Partial<Address> = {}
		const addr = place.address
		if (!addr) return a
		if (addr.house_number) a.number = addr.house_number
		if (addr.road) a.street = addr.road
		if (addr.neighbourhood) a.neighborhood = addr.neighbourhood
		else if (addr.suburb) a.neighborhood = addr.suburb
		if (addr.city) a.city = addr.city
		else if (addr.town) a.city = addr.town
		else if (addr.village) a.city = addr.village
		if (addr.state) a.state = addr.state
		else if (addr.county) a.state = addr.county
		if (addr.country) a.country = addr.country
		if (addr.postcode) a.postalCode = addr.postcode
		return a
	}

	private nominatimPlaceToReverseResult(
		place: NominatimPlace,
		lat: number,
		lng: number
	): ReverseGeocodeResult {
		const address = this.extractAddressComponents(place)
		return {
			address: {
				formattedAddress: place.display_name,
				...address,
				placeId: String(place.place_id),
			},
			coordinates: { lat, lng },
			placeId: String(place.place_id),
			locationType: place.category ?? place.type ?? 'APPROXIMATE',
		}
	}

	private nominatimPlaceToPlacePrediction(
		place: NominatimPlace
	): PlacePrediction {
		return {
			description: place.display_name,
			placeId: String(place.place_id),
			matchedSubstrings: undefined,
			structuredFormatting: {
				mainText:
					place.address?.road ??
					place.display_name.split(',')[0] ??
					place.display_name,
				mainTextMatchedSubstrings: [],
				secondaryText: place.display_name,
			},
		}
	}
}
