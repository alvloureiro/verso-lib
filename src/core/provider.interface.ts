/**
 * Map provider contract. All map providers (Google, Mapbox, etc.) must implement this interface.
 */

import type {
	LatLng,
	Bounds,
	GeocodeResult,
	ReverseGeocodeResult,
	DistanceMatrixResponse,
	RouteResult,
	PlacePrediction,
} from './types'

/**
 * Options for reverse geocoding requests (coordinates -> address)
 */
export interface ReverseGeocodeOptions {
	/** Language for results (e.g. 'pt-BR') */
	language?: string
	/** Restrict to specific address types (e.g. ['street_address', 'route']) */
	resultType?: string[]
	/** Restrict to specific location types (e.g. ['ROOFTOP', 'RANGE_INTERPOLATED']) */
	locationType?: string[]
}

/**
 * Options for geocoding requests
 */
export interface GeocodeOptions {
	/** Country code bias (e.g. 'br' for Brazil). */
	region?: string
	/** Language for results (e.g. 'pt-BR'). */
	language?: string
	/** Bias viewport. */
	bounds?: Bounds
	/** Component filtering (e.g. { country: 'BR', postal_code: '01310-100' }). */
	components?: Record<string, string>
	/** When true, skip cache read and write (e.g. for refresh). */
	skipCache?: boolean
}

/**
 * Options for distance matrix requests
 */
export interface DistanceMatrixOptions {
	mode?: 'driving' | 'walking' | 'bicycling' | 'transit'
	language?: string
	avoid?: ('tolls' | 'highways' | 'ferries')[]
}

/**
 * Options for route requests
 */
export interface RouteOptions {
	mode?: 'driving' | 'walking' | 'bicycling' | 'transit'
	alternatives?: boolean // Request alternative routes
	language?: string
	avoid?: ('tolls' | 'highways' | 'ferries')[]
}

/**
 * Options for place autocomplete requests
 */
export interface AutocompleteOptions {
	/** The language in which to return results (e.g., 'pt-BR') */
	language?: string
	/** The country code(s) to bias results (e.g., 'br' for Brazil) */
	components?: { country: string | string[] }
	/** The location (latitude, longitude) around which to bias results */
	location?: LatLng
	/** The radius (in meters) around the location to bias results */
	radius?: number
	/** Whether to restrict results to a specific type (e.g., 'address') */
	types?: string
	/** A session token to group autocomplete and place details requests for billing */
	sessionToken?: string
}

/**
 * Contract that all map providers must implement
 */
export interface MapProvider {
	/**
	 * Convert an address string to geographic coordinates
	 * @param address - The address to geocode (e.g., "Av. Paulista, 1000, São Paulo")
	 * @param options - Optional parameters
	 * @returns Array of geocode results (multiple if ambiguous)
	 */
	geocode(address: string, options?: GeocodeOptions): Promise<GeocodeResult[]>

	/**
	 * Convert geographic coordinates to an address
	 * @param lat - Latitude
	 * @param lng - Longitude
	 * @param options - Optional language, resultType, locationType
	 * @returns Reverse geocode result with address information
	 */
	reverseGeocode(
		lat: number,
		lng: number,
		options?: ReverseGeocodeOptions
	): Promise<ReverseGeocodeResult>

	/**
	 * Calculate distances and durations between multiple origins and destinations
	 * @param origins - Array of starting points
	 * @param destinations - Array of ending points
	 * @param options - Optional parameters
	 * @returns Matrix of distances and durations
	 */
	getDistanceMatrix(
		origins: LatLng[],
		destinations: LatLng[],
		options?: DistanceMatrixOptions
	): Promise<DistanceMatrixResponse>

	/**
	 * Get a route/directions between two or more points
	 * @param origin - Starting point
	 * @param destination - Ending point
	 * @param waypoints - Optional intermediate points
	 * @param options - Optional parameters
	 * @returns Route information including polyline and steps
	 */
	getRoute(
		origin: LatLng,
		destination: LatLng,
		waypoints?: LatLng[],
		options?: RouteOptions
	): Promise<RouteResult>

	/**
	 * Get place suggestions (autocomplete) for a partial address input.
	 * @param input - Partial input string (e.g., "Av. Paulista")
	 * @param options - Optional language, components, location, radius, types, sessionToken
	 * @returns Array of place predictions with description and placeId
	 */
	autocomplete(
		input: string,
		options?: AutocompleteOptions
	): Promise<PlacePrediction[]>
}
