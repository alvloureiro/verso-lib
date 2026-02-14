import { describe, it, expect } from 'vitest'
import { createMapClient } from '../../../src/providers'
import { GoogleMapsProvider } from '../../../src/providers/google'
import { NoopCache } from '../../../src/cache/noop.cache'
import type { MapProvider } from '../../../src/core/provider.interface'

describe('createMapClient', () => {
	it('returns an instance of GoogleMapsProvider when provider is "google"', () => {
		const client = createMapClient({
			provider: 'google',
			apiKey: 'test-key',
		})
		expect(client).toBeInstanceOf(GoogleMapsProvider)
	})

	it('returns an object that conforms to MapProvider (duck typing)', () => {
		const client = createMapClient({
			provider: 'google',
			apiKey: 'test-key',
		})
		const provider = client as MapProvider
		expect(typeof provider.geocode).toBe('function')
		expect(typeof provider.reverseGeocode).toBe('function')
		expect(typeof provider.getDistanceMatrix).toBe('function')
		expect(typeof provider.getRoute).toBe('function')
	})

	it('uses NoopCache when no cache is provided', () => {
		const client = createMapClient({
			provider: 'google',
			apiKey: 'test-key',
		}) as GoogleMapsProvider
		expect(client.cache).toBeInstanceOf(NoopCache)
	})

	it('uses the provided cache when cache is passed', () => {
		const customCache = new NoopCache()
		const client = createMapClient({
			provider: 'google',
			apiKey: 'test-key',
			cache: customCache,
		}) as GoogleMapsProvider
		expect(client.cache).toBe(customCache)
	})

	it('accepts httpConfig without throwing', () => {
		const client = createMapClient({
			provider: 'google',
			apiKey: 'test-key',
			httpConfig: { timeout: 5000, retries: 2 },
		})
		expect(client).toBeInstanceOf(GoogleMapsProvider)
	})

	it('throws for unsupported provider', () => {
		const badConfig = {
			provider: 'unsupported',
			apiKey: 'x',
		} as Parameters<typeof createMapClient>[0]
		expect(() => createMapClient(badConfig)).toThrow(
			'Unsupported provider: unsupported'
		)
	})

	it('skeleton methods throw NotImplemented errors', async () => {
		const client = createMapClient({
			provider: 'google',
			apiKey: 'test-key',
		})
		await expect(client.geocode('address')).rejects.toThrow(
			'NotImplemented: geocode'
		)
		await expect(client.reverseGeocode(0, 0)).rejects.toThrow(
			'NotImplemented: reverseGeocode'
		)
		await expect(
			client.getDistanceMatrix([{ lat: 0, lng: 0 }], [{ lat: 1, lng: 1 }])
		).rejects.toThrow('NotImplemented: getDistanceMatrix')
		await expect(
			client.getRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 })
		).rejects.toThrow('NotImplemented: getRoute')
	})
})
