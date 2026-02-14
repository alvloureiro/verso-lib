/**
 * Mapbox API provider (stub). Implement with Geocoding, Matrix, Directions APIs.
 */

import type { MapProvider } from '../../core/provider.interface'
import type {
	GeocodingResult,
	DistanceMatrixResult,
	RouteResult,
	LatLng,
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

	async geocode(address: string): Promise<GeocodingResult | null> {
		// TODO: call Mapbox Geocoding API
		void this.accessToken
		void this.baseUrl
		void address
		return null
	}

	async getDistanceMatrix(
		origins: (string | LatLng)[],
		destinations: (string | LatLng)[]
	): Promise<DistanceMatrixResult> {
		// TODO: call Mapbox Matrix API
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
		// TODO: call Mapbox Directions API
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
