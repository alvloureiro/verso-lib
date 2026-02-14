/**
 * Mapbox API provider (stub). Implement with Geocoding, Matrix, Directions APIs.
 */

import type {
	GeocodeOptions,
	DistanceMatrixOptions,
	RouteOptions,
	MapProvider,
} from '../../core/provider.interface'
import type {
	GeocodeResult,
	ReverseGeocodeResult,
	DistanceMatrixResponse,
	RouteResult,
	LatLng,
	Bounds,
} from '../../core/types'

export interface MapboxProviderConfig {
	accessToken: string
	baseUrl?: string
}

/**
 * Mapbox provider. Stub implementation; wire to real APIs in integration.
 */
export class MapboxProvider implements MapProvider {
	private readonly accessToken: string
	private readonly baseUrl: string

	constructor(config: MapboxProviderConfig) {
		this.accessToken = config.accessToken
		this.baseUrl = config.baseUrl ?? 'https://api.mapbox.com'
	}

	async geocode(
		address: string,
		options?: GeocodeOptions
	): Promise<GeocodeResult[]> {
		// TODO: call Mapbox Geocoding API
		void this.accessToken
		void this.baseUrl
		void address
		void options
		return []
	}

	async reverseGeocode(
		lat: number,
		lng: number
	): Promise<ReverseGeocodeResult> {
		// TODO: call Mapbox Reverse Geocoding API
		void this.accessToken
		void this.baseUrl
		return {
			address: { formattedAddress: '' },
			coordinates: { lat, lng },
		}
	}

	async getDistanceMatrix(
		origins: LatLng[],
		destinations: LatLng[],
		options?: DistanceMatrixOptions
	): Promise<DistanceMatrixResponse> {
		// TODO: call Mapbox Matrix API
		void this.accessToken
		void this.baseUrl
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
		// TODO: call Mapbox Directions API
		void this.accessToken
		void this.baseUrl
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
}
