/**
 * Core types shared across map providers and services.
 */

/** Supported map provider identifiers. */
export type ProviderId = 'google' | 'mapbox'

/** Geographic coordinates (WGS84). */
export interface LatLng {
	/** Latitude in degrees. */
	lat: number
	/** Longitude in degrees. */
	lng: number
}

/** Result of a geocoding request (address → coordinates). */
export interface GeocodingResult {
	/** Resolved coordinates. */
	location: LatLng
	/** Formatted address string from the provider. */
	formattedAddress?: string
	/** Place ID or equivalent from the provider. */
	placeId?: string
}

/** Single element in a distance matrix (origin index → destination index). */
export interface DistanceMatrixElement {
	/** Distance in meters. */
	distanceMeters: number
	/** Duration in seconds. */
	durationSeconds: number
	/** Optional status from the provider. */
	status?: string
}

/** Result of a distance matrix request. */
export interface DistanceMatrixResult {
	/** Row-major matrix: [originIndex][destinationIndex]. */
	elements: DistanceMatrixElement[][]
	/** Origin addresses or coordinates used. */
	origins: (string | LatLng)[]
	/** Destination addresses or coordinates used. */
	destinations: (string | LatLng)[]
}

/** Single step in a route (e.g. turn instruction). */
export interface RouteStep {
	/** Human-readable instruction. */
	instruction?: string
	/** Distance in meters for this step. */
	distanceMeters: number
	/** Duration in seconds for this step. */
	durationSeconds: number
	/** Start point of the step. */
	startLocation: LatLng
	/** End point of the step. */
	endLocation: LatLng
}

/** Result of a routing request (directions). */
export interface RouteResult {
	/** Ordered list of points forming the path. */
	polyline: LatLng[]
	/** Step-by-step instructions. */
	steps: RouteStep[]
	/** Total distance in meters. */
	totalDistanceMeters: number
	/** Total duration in seconds. */
	totalDurationSeconds: number
}
