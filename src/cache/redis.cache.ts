/**
 * Redis cache adapter. Requires a Redis client to be injected by the consumer.
 * Compatible with ioredis, node-redis, or similar (get/set/del interface).
 */

import type { Cache } from '../core/cache.interface'

/**
 * Minimal Redis-like client interface (inject actual Redis client).
 */
export interface RedisLikeClient {
	get(key: string): Promise<string | null>
	set(key: string, value: string, options?: { EX?: number }): Promise<void>
	del(key: string): Promise<number>
}

/**
 * Redis-backed cache. Inject your Redis client (e.g. from ioredis or node-redis).
 */
export class RedisCache implements Cache {
	constructor(private readonly client: RedisLikeClient) {}

	async get<T>(key: string): Promise<T | undefined> {
		const raw = await this.client.get(key)
		if (raw === null) return undefined
		try {
			return JSON.parse(raw) as T
		} catch {
			return undefined
		}
	}

	async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
		const serialized = JSON.stringify(value)
		await this.client.set(key, serialized, {
			...(ttlSeconds > 0 && { EX: ttlSeconds }),
		})
	}

	async del(key: string): Promise<void> {
		await this.client.del(key)
	}
}
