/**
 * Core domain types shared across map providers and services.
 */

/**
 * Geographic coordinates (latitude/longitude)
 */
export interface LatLng {
	lat: number
	lng: number
}

/**
 * Geographic bounding box
 */
export interface Bounds {
	northeast: LatLng
	southwest: LatLng
}

/**
 * Structured address information
 */
export interface Address {
	formattedAddress: string
	street?: string
	number?: string
	neighborhood?: string
	city?: string
	state?: string
	country?: string
	postalCode?: string
	placeId?: string
}

/**
 * Result of a geocoding operation (address -> coordinates)
 */
export interface GeocodeResult {
	coordinates: LatLng
	address: Address
	placeId: string
	bounds?: Bounds
	/** Indicates if the provider returned a partial match. */
	partialMatch?: boolean
}

/**
 * Result of a reverse geocoding operation (coordinates -> address)
 */
export interface ReverseGeocodeResult {
	address: Address
	coordinates: LatLng
	/** Google's place ID, if available */
	placeId?: string
	/** e.g. "ROOFTOP", "RANGE_INTERPOLATED", "GEOMETRIC_CENTER", "APPROXIMATE" */
	locationType?: string
}

/**
 * Single entry in a distance matrix response
 */
export interface DistanceMatrixEntry {
	distance: {
		text: string // Human-readable (e.g., "5.3 km")
		value: number // Value in meters
	}
	duration: {
		text: string // Human-readable (e.g., "12 mins")
		value: number // Value in seconds
	}
	status: 'OK' | 'NOT_FOUND' | 'ZERO_RESULTS'
}

/**
 * Complete distance matrix response
 */
export interface DistanceMatrixResponse {
	origins: LatLng[]
	destinations: LatLng[]
	rows: DistanceMatrixEntry[][]
}

/**
 * A step in a route (turn-by-turn instruction)
 */
export interface RouteStep {
	instruction: string // e.g., "Turn left onto Av. Paulista"
	distance: {
		text: string
		value: number
	}
	duration: {
		text: string
		value: number
	}
	startLocation: LatLng
	endLocation: LatLng
	polyline?: string // Encoded polyline for this step
}

/**
 * A place prediction returned by the autocomplete service.
 */
export interface PlacePrediction {
	/** The human‑readable description of the place (e.g., "Av. Paulista, 1000 - São Paulo") */
	description: string
	/** The place ID that can be used later to get place details or for geocoding */
	placeId: string
	/** (Optional) An array of matched substrings in the description for highlighting */
	matchedSubstrings?: Array<{ length: number; offset: number }>
	/** (Optional) The structured formatting of the description */
	structuredFormatting?: {
		mainText: string
		mainTextMatchedSubstrings: Array<{ length: number; offset: number }>
		secondaryText: string
	}
}

/**
 * Complete route result
 */
export interface RouteResult {
	summary: string // e.g., "Via Av. Paulista"
	distance: {
		text: string
		value: number
	}
	duration: {
		text: string
		value: number
	}
	polyline: string // Encoded polyline for the entire route
	steps: RouteStep[]
	bounds: Bounds
}
