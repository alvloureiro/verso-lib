/**
 * Google Maps API provider (stub). Implement with Geocoding, Distance Matrix, Directions APIs.
 */

import type { MapProvider } from '../../core/provider.interface'
import type {
	GeocodingResult,
	DistanceMatrixResult,
	RouteResult,
	LatLng,
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

	async geocode(address: string): Promise<GeocodingResult | null> {
		// TODO: call Google Geocoding API
		void this.apiKey
		void this.baseUrl
		void address
		return null
	}

	async getDistanceMatrix(
		origins: (string | LatLng)[],
		destinations: (string | LatLng)[]
	): Promise<DistanceMatrixResult> {
		// TODO: call Google Distance Matrix API
		void origins
		void destinations
		return {
			elements: [],
			origins: [...origins],
			destinations: [...destinations],
		}
	}

	async getRoute(
		origin: string | LatLng,
		destination: string | LatLng
	): Promise<RouteResult> {
		// TODO: call Google Directions API
		void origin
		void destination
		return {
			polyline: [],
			steps: [],
			totalDistanceMeters: 0,
			totalDurationSeconds: 0,
		}
	}
}
