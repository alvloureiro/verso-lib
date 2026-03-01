import { describe, it, expect } from 'vitest'
import { MemoryCache } from '@/cache/memory.cache'

describe('MemoryCache', () => {
	describe('without maxSize', () => {
		it('stores and retrieves values with TTL', async () => {
			const cache = new MemoryCache()
			await cache.set('a', 1, 60)
			await cache.set('b', 2, 60)
			expect(await cache.get<number>('a')).toBe(1)
			expect(await cache.get<number>('b')).toBe(2)
		})

		it('clear removes all entries', async () => {
			const cache = new MemoryCache()
			await cache.set('k', 'v', 60)
			cache.clear()
			expect(await cache.get('k')).toBeUndefined()
		})
	})

	describe('with maxSize', () => {
		it('evicts oldest entries when at capacity', async () => {
			const cache = new MemoryCache({ maxSize: 2 })
			await cache.set('first', 1, 60)
			await cache.set('second', 2, 60)
			expect(await cache.get<number>('first')).toBe(1)
			expect(await cache.get<number>('second')).toBe(2)

			await cache.set('third', 3, 60)
			expect(await cache.get<number>('first')).toBeUndefined()
			expect(await cache.get<number>('second')).toBe(2)
			expect(await cache.get<number>('third')).toBe(3)
		})

		it('updating existing key does not evict by insertion order', async () => {
			const cache = new MemoryCache({ maxSize: 2 })
			await cache.set('a', 1, 60)
			await cache.set('b', 2, 60)
			await cache.set('a', 10, 60)
			expect(await cache.get<number>('a')).toBe(10)
			expect(await cache.get<number>('b')).toBe(2)
		})

		it('evicts multiple when far over capacity', async () => {
			const cache = new MemoryCache({ maxSize: 2 })
			await cache.set('1', 1, 60)
			await cache.set('2', 2, 60)
			await cache.set('3', 3, 60)
			await cache.set('4', 4, 60)
			expect(await cache.get<number>('1')).toBeUndefined()
			expect(await cache.get<number>('2')).toBeUndefined()
			expect(await cache.get<number>('3')).toBe(3)
			expect(await cache.get<number>('4')).toBe(4)
		})

		it('maxSize 1 keeps only the latest', async () => {
			const cache = new MemoryCache({ maxSize: 1 })
			await cache.set('x', 1, 60)
			expect(await cache.get<number>('x')).toBe(1)
			await cache.set('y', 2, 60)
			expect(await cache.get<number>('x')).toBeUndefined()
			expect(await cache.get<number>('y')).toBe(2)
		})

		it('has returns false for evicted key', async () => {
			const cache = new MemoryCache({ maxSize: 1 })
			await cache.set('a', 1, 60)
			await cache.set('b', 2, 60)
			expect(await cache.has('a')).toBe(false)
			expect(await cache.has('b')).toBe(true)
		})

		it('ignores maxSize when 0 or negative', async () => {
			const cache = new MemoryCache({ maxSize: 0 })
			await cache.set('a', 1, 60)
			await cache.set('b', 2, 60)
			await cache.set('c', 3, 60)
			expect(await cache.get<number>('a')).toBe(1)
			expect(await cache.get<number>('b')).toBe(2)
			expect(await cache.get<number>('c')).toBe(3)
		})
	})
})
