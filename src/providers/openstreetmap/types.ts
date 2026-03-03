/**
 * Nominatim (OpenStreetMap) API response types.
 * @see https://nominatim.org/release-docs/develop/api/Search/
 * @see https://nominatim.org/release-docs/develop/api/Reverse/
 * @see https://nominatim.org/release-docs/develop/api/Output/
 */

/** Address breakdown when addressdetails=1 (jsonv2). */
export interface NominatimAddress {
	house_number?: string
	road?: string
	neighbourhood?: string
	suburb?: string
	village?: string
	town?: string
	city?: string
	county?: string
	state?: string
	state_district?: string
	postcode?: string
	country?: string
	country_code?: string
	[key: string]: string | undefined
}

/** Single place in Nominatim jsonv2 format (search returns array, reverse returns one). */
export interface NominatimPlace {
	place_id: number
	osm_type: string
	osm_id: number
	lat: string
	lon: string
	display_name: string
	category?: string
	type?: string
	place_rank?: number
	importance?: number
	address?: NominatimAddress
	boundingbox?: [string, string, string, string] // min_lat, max_lat, min_lon, max_lon
	licence?: string
}
