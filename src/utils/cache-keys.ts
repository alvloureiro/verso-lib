/**
 * Deterministic cache key generation for provider caches.
 * Uses a simple hash so it works in browser, React Native, and Node.
 * Object keys are normalized (sorted) so key order does not affect the hash.
 */

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
