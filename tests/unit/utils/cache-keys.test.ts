import { describe, it, expect } from 'vitest'
import {
	generateCacheKey,
	generateDistanceMatrixCacheKey,
} from '@/utils/cache-keys'

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

describe('generateDistanceMatrixCacheKey', () => {
	it('produces same key for same origins, destinations, and options', () => {
		const origins = [{ lat: -23.55, lng: -46.63 }]
		const destinations = [
			{ lat: -23.56, lng: -46.64 },
			{ lat: -23.57, lng: -46.65 },
		]
		const key1 = generateDistanceMatrixCacheKey(origins, destinations, {
			mode: 'driving',
			language: 'pt-BR',
		})
		const key2 = generateDistanceMatrixCacheKey(origins, destinations, {
			language: 'pt-BR',
			mode: 'driving',
		})
		expect(key1).toBe(key2)
		expect(key1).toMatch(/^distance-matrix:[a-z0-9]+$/)
	})

	it('produces different keys for different origins or options', () => {
		const dests = [{ lat: 1, lng: 1 }]
		const key1 = generateDistanceMatrixCacheKey(
			[{ lat: 0, lng: 0 }],
			dests
		)
		const key2 = generateDistanceMatrixCacheKey(
			[{ lat: 0.1, lng: 0.1 }],
			dests
		)
		const key3 = generateDistanceMatrixCacheKey(
			[{ lat: 0, lng: 0 }],
			dests,
			{ mode: 'walking' }
		)
		expect(key1).not.toBe(key2)
		expect(key1).not.toBe(key3)
	})
})
