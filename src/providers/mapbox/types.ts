/**
 * Mapbox Geocoding API response types.
 * @see https://docs.mapbox.com/api/search/geocoding/
 */

export interface MapboxGeocodeResponse {
	type: 'FeatureCollection'
	query: string[]
	features: MapboxFeature[]
	attribution: string
}

export interface MapboxFeature {
	id: string
	type: 'Feature'
	place_type: string[]
	relevance: number
	properties: {
		accuracy?: string
		wikidata?: string
		short_code?: string
		category?: string
		maki?: string
	}
	text: string
	place_name: string
	center: [number, number]
	geometry: {
		type: 'Point'
		coordinates: [number, number]
	}
	address?: string
	context: Array<{
		id: string
		text: string
		wikidata?: string
		short_code?: string
	}>
	matching_text?: string
	matching_place_name?: string
}

/**
 * Mapbox Matrix API response (durations in seconds, distances in meters).
 * @see https://docs.mapbox.com/api/navigation/matrix/
 */
export interface MapboxMatrixResponse {
	code: string
	durations?: (number | null)[][]
	distances?: (number | null)[][]
	sources?: unknown[]
	destinations?: unknown[]
	message?: string
}
