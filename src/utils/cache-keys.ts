/**
 * Deterministic cache key generation for provider caches.
 * Uses a simple hash so it works in browser, React Native, and Node.
 * Object keys are normalized (sorted) so key order does not affect the hash.
 * Key generation is linear in input size. Keys are best-effort unique;
 * collisions are possible for different inputs.
 */

import type {
	GeocodeOptions,
	DistanceMatrixOptions,
} from '../core/provider.interface'
import type { LatLng } from '../core/types'

/**
 * Stringify a value for hashing. Objects are serialized with sorted keys
 * (recursively) so that key order does not affect the cache key.
 */
function stringifyForHash(value: unknown): string {
	if (value === null) return 'null'
	if (typeof value !== 'object') return String(value)
	if (Array.isArray(value)) {
		return '[' + value.map(stringifyForHash).join(',') + ']'
	}
	const keys = Object.keys(value as Record<string, unknown>).sort()
	const pairs = keys.map(
		(k) =>
			JSON.stringify(k) +
			':' +
			stringifyForHash((value as Record<string, unknown>)[k])
	)
	return '{' + pairs.join(',') + '}'
}

/**
 * Builds a deterministic cache key from a prefix and one or more parts.
 * Objects are serialized with sorted keys so key order does not affect the hash.
 *
 * @param prefix - Key prefix (e.g. 'geocode', 'reverse-geocode')
 * @param parts - Parts to include (strings, numbers, or objects)
 * @returns A short key of the form `prefix:hash`
 */
export function generateCacheKey(prefix: string, ...parts: unknown[]): string {
	const stringToHash = parts.map(stringifyForHash).join('|')

	let hash = 0
	for (let i = 0; i < stringToHash.length; i++) {
		const char = stringToHash.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash
	}

	return `${prefix}:${Math.abs(hash).toString(36)}`
}

/**
 * Builds a deterministic cache key for a geocode request.
 * Reusable across providers so cache key shape stays consistent.
 *
 * @param address - Address string (normalized to lower case and trimmed).
 * @param options - Optional geocode options (region, language, bounds, etc.).
 * @returns A short key of the form `geocode:hash`
 */
export function generateGeocodeCacheKey(
	address: string,
	options?: GeocodeOptions
): string {
	const normalizedAddress = address.toLowerCase().trim()
	const opts = options ?? {}
	const rest = Object.fromEntries(
		Object.entries(opts).filter(([k]) => k !== 'skipCache')
	)
	return generateCacheKey('geocode', normalizedAddress, rest)
}

/**
 * Builds a deterministic cache key for a distance matrix request.
 * Uses sorted origins/destinations and options so key order does not affect the hash.
 *
 * @param origins - Array of origin coordinates
 * @param destinations - Array of destination coordinates
 * @param options - Optional distance matrix options (mode, avoid, language)
 * @returns A short key of the form `distance-matrix:hash`
 */
export function generateDistanceMatrixCacheKey(
	origins: LatLng[],
	destinations: LatLng[],
	options?: DistanceMatrixOptions
): string {
	const opts = options ?? {}
	return generateCacheKey('distance-matrix', origins, destinations, opts)
}
