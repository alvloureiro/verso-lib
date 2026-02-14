/**
 * Google Maps API provider (stub). Implement with Geocoding, Distance Matrix, Directions APIs.
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

export interface GoogleProviderConfig {
	apiKey: string
	baseUrl?: string
}

/**
 * Google Maps provider. Stub implementation; wire to real APIs in integration.
 */
export class GoogleProvider implements MapProvider {
	private readonly apiKey: string
	private readonly baseUrl: string

	constructor(config: GoogleProviderConfig) {
		this.apiKey = config.apiKey
		this.baseUrl = config.baseUrl ?? 'https://maps.googleapis.com/maps/api'
	}

	async geocode(
		address: string,
		options?: GeocodeOptions
	): Promise<GeocodeResult[]> {
		// TODO: call Google Geocoding API
		void this.apiKey
		void this.baseUrl
		void address
		void options
		return []
	}

	async reverseGeocode(
		lat: number,
		lng: number
	): Promise<ReverseGeocodeResult> {
		// TODO: call Google Reverse Geocoding API
		void this.apiKey
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
		// TODO: call Google Distance Matrix API
		void this.apiKey
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
		// TODO: call Google Directions API
		void this.apiKey
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
