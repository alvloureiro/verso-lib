/**
 * Deterministic cache key generation for provider caches.
 * Uses a simple hash so it works in browser, React Native, and Node.
 */

/**
 * Builds a deterministic cache key from a prefix and one or more parts.
 * Objects are JSON-stringified so key order does not affect the hash.
 *
 * @param prefix - Key prefix (e.g. 'geocode', 'reverse-geocode')
 * @param parts - Parts to include (strings, numbers, or objects)
 * @returns A short key of the form `prefix:hash`
 */
export function generateCacheKey(prefix: string, ...parts: unknown[]): string {
	const stringToHash = parts
		.map((part) =>
			typeof part === 'object' && part !== null
				? JSON.stringify(part)
				: String(part)
		)
		.join('|')

	let hash = 0
	for (let i = 0; i < stringToHash.length; i++) {
		const char = stringToHash.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash
	}

	return `${prefix}:${Math.abs(hash).toString(36)}`
}
