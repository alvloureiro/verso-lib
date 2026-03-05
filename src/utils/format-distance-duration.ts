/**
 * Helpers to format distance (meters) and duration (seconds) for
 * distance matrix entries when the provider returns only numeric values.
 */

/**
 * Format distance in meters as human-readable string (e.g. "5.2 km", "800 m").
 */
export function formatDistanceMeters(meters: number): string {
	if (meters >= 1000) {
		const km = Math.round((meters / 1000) * 10) / 10
		return `${km} km`
	}
	return `${Math.round(meters)} m`
}

/**
 * Format duration in seconds as human-readable string (e.g. "12 mins", "1 hour").
 */
export function formatDurationSeconds(seconds: number): string {
	if (seconds >= 3600) {
		const hours = Math.floor(seconds / 3600)
		const mins = Math.round((seconds % 3600) / 60)
		if (mins === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`
		return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} mins`
	}
	const mins = Math.round(seconds / 60)
	return `${mins} min${mins !== 1 ? 's' : ''}`
}
