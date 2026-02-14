/**
 * Geographic utility functions (e.g. haversine distance).
 */

import type { LatLng } from '../core/types'

/** Earth radius in meters (WGS84). */
const EARTH_RADIUS_METERS = 6_371_000

/**
 * Compute distance between two points using the haversine formula.
 * @param a - First point.
 * @param b - Second point.
 * @returns Distance in meters.
 */
export function haversineDistanceMeters(a: LatLng, b: LatLng): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180
	const dLat = toRad(b.lat - a.lat)
	const dLng = toRad(b.lng - a.lng)
	const sinHalfLat = Math.sin(dLat / 2)
	const sinHalfLng = Math.sin(dLng / 2)
	const x =
		sinHalfLat * sinHalfLat +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinHalfLng * sinHalfLng
	const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))
	return EARTH_RADIUS_METERS * c
}
