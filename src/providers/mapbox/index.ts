/**
 * Mapbox provider: geocoding, reverse geocoding, and autocomplete via Mapbox
 * Geocoding API. Uses HttpClient and optional cache.
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
	DistanceMatrixEntry,
	RouteResult,
	PlacePrediction,
	LatLng,
	Bounds,
} from '../../core/types'
import { HttpClient } from '../../http/http-client'
import { NoopCache } from '../../cache/noop.cache'
import { generateDistanceMatrixCacheKey } from '../../utils/cache-keys'
import {
	formatDistanceMeters,
	formatDurationSeconds,
} from '../../utils/format-distance-duration'
import type {
	MapboxGeocodeResponse,
	MapboxFeature,
	MapboxMatrixResponse,
} from './types'

const DEFAULT_MAPBOX_GEOCODING_BASE =
	'https://api.mapbox.com/geocoding/v5/mapbox.places'

export interface MapboxProviderConfig {
	accessToken: string
	baseUrl?: string
	cache?: Cache
	httpConfig?: { timeout?: number; retries?: number }
}

const DEFAULT_MAPBOX_MATRIX_BASE =
	'https://api.mapbox.com/directions-matrix/v1/mapbox'

/**
 * Mapbox provider implementing geocode, reverseGeocode, autocomplete, and
 * getDistanceMatrix via Mapbox Matrix API. getRoute remains a stub.
 */
export class MapboxProvider implements MapProvider {
	private readonly httpClient: HttpClient
	private readonly cache: Cache
	private readonly apiKey: string
	private readonly baseUrl: string

	constructor(config: MapboxProviderConfig) {
		this.apiKey = config.accessToken
		this.cache = config.cache ?? new NoopCache()
		this.baseUrl = config.baseUrl ?? DEFAULT_MAPBOX_GEOCODING_BASE
		this.httpClient = new HttpClient({
			baseURL: this.baseUrl,
			timeout: config.httpConfig?.timeout,
			maxRetries: config.httpConfig?.retries,
		})
	}

	async geocode(
		address: string,
		options?: GeocodeOptions
	): Promise<GeocodeResult[]> {
		if (!address.trim()) return []

		const cacheKey = `mapbox:geocode:${address}:${JSON.stringify(options ?? {})}`
		const cached = await this.cache.get<GeocodeResult[]>(cacheKey)
		if (cached) return cached

		const params = this.buildCommonParams({
			language: options?.language,
			country: options?.components?.country,
			limit: 5,
		})
		if (options?.location) {
			params.proximity = `${options.location.lng},${options.location.lat}`
		}

		try {
			const response = await this.httpClient.request<MapboxGeocodeResponse>({
				url: `/${encodeURIComponent(address)}.json`,
				method: 'GET',
				params,
			})
			const results = this.parseGeocodeFeatures(response.features ?? [])
			await this.cache.set(cacheKey, results, 7 * 24 * 60 * 60)
			return results
		} catch (error) {
			console.error('Mapbox geocoding error:', error)
			return []
		}
	}

	async reverseGeocode(
		lat: number,
		lng: number,
		options?: ReverseGeocodeOptions
	): Promise<ReverseGeocodeResult> {
		const cacheKey = `mapbox:reverse:${lat},${lng}:${JSON.stringify(options ?? {})}`
		const cached = await this.cache.get<ReverseGeocodeResult>(cacheKey)
		if (cached) return cached

		const params = this.buildCommonParams({
			language: options?.language,
			limit: 1,
		})
		if (options?.resultType?.length) {
			params.types = options.resultType.join(',')
		}

		try {
			const response = await this.httpClient.request<MapboxGeocodeResponse>({
				url: `/${lng},${lat}.json`,
				method: 'GET',
				params,
			})
			if (!response.features?.length) {
				throw new Error('No address found for the given coordinates')
			}
			const feature = response.features[0]
			const geocodeResult = this.mapboxFeatureToGeocodeResult(feature)
			const result: ReverseGeocodeResult = {
				address: geocodeResult.address,
				coordinates: { lat, lng },
				placeId: geocodeResult.placeId,
				locationType: feature.properties?.accuracy ?? 'APPROXIMATE',
			}
			await this.cache.set(cacheKey, result, 30 * 24 * 60 * 60)
			return result
		} catch (error) {
			console.error('Mapbox reverse geocoding error:', error)
			throw error
		}
	}

	async autocomplete(
		input: string,
		options?: AutocompleteOptions
	): Promise<PlacePrediction[]> {
		if (!input.trim()) return []

		const params = this.buildCommonParams({
			language: options?.language,
			country: options?.components?.country,
			limit: 5,
		})
		params.types = options?.types ?? 'address,poi'
		if (options?.location) {
			params.proximity = `${options.location.lng},${options.location.lat}`
		}

		try {
			const response = await this.httpClient.request<MapboxGeocodeResponse>({
				url: `/${encodeURIComponent(input)}.json`,
				method: 'GET',
				params,
			})
			return (response.features ?? []).map((f) =>
				this.mapboxFeatureToPlacePrediction(f)
			)
		} catch (error) {
			console.error('Mapbox autocomplete error:', error)
			return []
		}
	}

	/**
	 * Get distance matrix via Mapbox Matrix API. Uses cache (7-day TTL).
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

		const profile = this.mapModeToMapboxProfile(options?.mode ?? 'driving')
		const allCoords = [...origins, ...destinations]
		const coordinates = allCoords
			.map((p) => `${p.lng},${p.lat}`)
			.join(';')
		const sources = Array.from(
			{ length: origins.length },
			(_, i) => i
		).join(';')
		const destIndices = Array.from(
			{ length: destinations.length },
			(_, i) => origins.length + i
		).join(';')

		const matrixUrl = `${DEFAULT_MAPBOX_MATRIX_BASE}/${profile}/${coordinates}`
		const params: Record<string, string> = {
			access_token: this.apiKey,
			sources,
			destinations: destIndices,
			annotations: 'distance,duration',
		}

		const response = await this.httpClient.request<MapboxMatrixResponse>({
			url: matrixUrl,
			method: 'GET',
			params,
		})

		if (response.code !== 'Ok') {
			throw new Error(
				`Mapbox Matrix API error: ${response.code} - ${response.message ?? ''}`
			)
		}

		const result = this.parseMapboxMatrixResponse(
			response,
			origins,
			destinations
		)
		await this.cache.set(cacheKey, result, 7 * 24 * 60 * 60)
		return result
	}

	private mapModeToMapboxProfile(
		mode: DistanceMatrixOptions['mode']
	): string {
		switch (mode) {
			case 'walking':
				return 'walking'
			case 'bicycling':
				return 'cycling'
			case 'transit':
				return 'driving'
			default:
				return 'driving'
		}
	}

	private parseMapboxMatrixResponse(
		response: MapboxMatrixResponse,
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

	private buildCommonParams(options?: {
		language?: string
		country?: string | string[]
		limit?: number
	}): Record<string, string> {
		const params: Record<string, string> = {
			access_token: this.apiKey,
		}
		if (options?.language) params.language = options.language
		if (options?.country) {
			params.country = Array.isArray(options.country)
				? options.country.join(',')
				: options.country
		}
		if (options?.limit) params.limit = String(options.limit)
		return params
	}

	private parseGeocodeFeatures(features: MapboxFeature[]): GeocodeResult[] {
		return features.map((f) => this.mapboxFeatureToGeocodeResult(f))
	}

	private mapboxFeatureToGeocodeResult(feature: MapboxFeature): GeocodeResult {
		const address = this.extractAddressComponents(feature)
		return {
			coordinates: {
				lat: feature.center[1],
				lng: feature.center[0],
			},
			address: {
				formattedAddress: feature.place_name,
				...address,
				placeId: feature.id,
			},
			placeId: feature.id,
			bounds: undefined,
			partialMatch: feature.relevance < 0.9,
		}
	}

	private extractAddressComponents(feature: MapboxFeature): Partial<Address> {
		const address: Partial<Address> = {}
		if (feature.address) address.number = feature.address
		if (feature.text) address.street = feature.text
		if (feature.context) {
			for (const ctx of feature.context) {
				if (ctx.id.startsWith('neighborhood')) address.neighborhood = ctx.text
				if (ctx.id.startsWith('place')) address.city = ctx.text
				if (ctx.id.startsWith('region')) address.state = ctx.text
				if (ctx.id.startsWith('country')) address.country = ctx.text
				if (ctx.id.startsWith('postcode')) address.postalCode = ctx.text
			}
		}
		return address
	}

	private mapboxFeatureToPlacePrediction(
		feature: MapboxFeature
	): PlacePrediction {
		const structuredFormatting = feature.matching_place_name
			? {
					mainText: feature.matching_text ?? feature.text,
					mainTextMatchedSubstrings: [] as Array<{
						length: number
						offset: number
					}>,
					secondaryText: feature.place_name
						.replace(feature.matching_place_name, '')
						.trim(),
				}
			: undefined
		return {
			description: feature.place_name,
			placeId: feature.id,
			matchedSubstrings: undefined,
			structuredFormatting,
		}
	}
}
