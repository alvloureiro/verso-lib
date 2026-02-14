/**
 * Generic cache interface for storing and retrieving data.
 * Implementations can use Redis, in-memory, NoOp, etc.
 */
export interface Cache {
	/**
	 * Retrieve a value from cache
	 * @param key - Cache key
	 * @returns The cached value or undefined if not found/expired
	 */
	get<T>(key: string): Promise<T | undefined>

	/**
	 * Store a value in cache with TTL
	 * @param key - Cache key
	 * @param value - Value to store
	 * @param ttlSeconds - Time to live in seconds
	 */
	set<T>(key: string, value: T, ttlSeconds: number): Promise<void>

	/**
	 * Remove a value from cache
	 * @param key - Cache key to delete
	 */
	del(key: string): Promise<void>

	/**
	 * Optional: Check if cache has a key
	 * @param key - Cache key
	 */
	has?(key: string): Promise<boolean>
}
