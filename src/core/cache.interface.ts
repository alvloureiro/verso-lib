/**
 * Abstract cache interface for Redis/Memcached or in-memory implementations.
 * The client is to be injected by the consumer.
 */

/**
 * Cache interface used by the library for geocoding, distance, and route caching.
 * Implement with Redis, Memcached, or in-memory store.
 */
export interface CacheInterface {
	/**
	 * Get a value by key.
	 * @param key - Cache key.
	 * @returns Cached value or undefined if missing/expired.
	 */
	get<T>(key: string): Promise<T | undefined>

	/**
	 * Set a value with optional TTL.
	 * @param key - Cache key.
	 * @param value - Value to store (will be serialized).
	 * @param ttlSeconds - Optional time-to-live in seconds.
	 */
	set(key: string, value: unknown, ttlSeconds?: number): Promise<void>

	/**
	 * Delete a key.
	 * @param key - Cache key.
	 */
	del(key: string): Promise<void>

	/**
	 * Check if a key exists (optional; some implementations may not support).
	 * @param key - Cache key.
	 * @returns True if the key exists.
	 */
	has?(key: string): Promise<boolean>
}
