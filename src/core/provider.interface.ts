/**
 * Map provider interface. Concrete implementations: Google Maps, Mapbox, etc.
 */

import type {
	GeocodingResult,
	DistanceMatrixResult,
	RouteResult,
	LatLng,
} from './types'

/**
 * Common interface for map API providers (Google, Mapbox, etc.).
 * Enables swapping providers without changing consumer code.
 */
export interface MapProvider {
	/**
	 * Resolve an address or place query to coordinates.
	 * @param address - Address string or place query.
	 * @returns Geocoding result or null if not found.
	 */
	geocode(address: string): Promise<GeocodingResult | null>

	/**
	 * Compute distance matrix between origins and destinations.
	 * @param origins - Origin addresses or coordinates.
	 * @param destinations - Destination addresses or coordinates.
	 * @returns Matrix of distances and durations.
	 */
	getDistanceMatrix(
		origins: (string | LatLng)[],
		destinations: (string | LatLng)[]
	): Promise<DistanceMatrixResult>

	/**
	 * Get route (directions) between origin and destination.
	 * @param origin - Origin address or coordinates.
	 * @param destination - Destination address or coordinates.
	 * @returns Route with polyline and steps.
	 */
	getRoute(
		origin: string | LatLng,
		destination: string | LatLng
	): Promise<RouteResult>
}
