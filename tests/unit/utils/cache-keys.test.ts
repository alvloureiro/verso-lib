import { describe, it, expect } from 'vitest'
import { generateCacheKey } from '@/utils/cache-keys'

describe('generateCacheKey', () => {
	it('produces same key for same options with different key order', () => {
		const key1 = generateCacheKey('geocode', 'Rua X', {
			region: 'br',
			language: 'pt-BR',
		})
		const key2 = generateCacheKey('geocode', 'Rua X', {
			language: 'pt-BR',
			region: 'br',
		})
		expect(key1).toBe(key2)
	})

	it('produces different keys for different options', () => {
		const key1 = generateCacheKey('geocode', 'Rua X', { region: 'br' })
		const key2 = generateCacheKey('geocode', 'Rua X', { region: 'us' })
		expect(key1).not.toBe(key2)
	})
})
