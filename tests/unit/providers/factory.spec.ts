import { describe, it, expect } from 'vitest'
import { createMapClient } from '@/providers'
import { GoogleMapsProvider } from '@/providers/google'
import { MapboxProvider } from '@/providers/mapbox'
import { OpenStreetMapProvider } from '@/providers/openstreetmap'
import { OsmProvider } from '@/providers/osm'
import type { MapProvider } from '@/core/provider.interface'

describe('createMapClient', () => {
	it('returns an instance of GoogleMapsProvider when provider is "google"', () => {
		const client = createMapClient({
			provider: 'google',
			apiKey: 'test-key',
		})
		expect(client).toBeInstanceOf(GoogleMapsProvider)
	})

	it('returns an instance of MapboxProvider when provider is "mapbox"', () => {
		const client = createMapClient({
			provider: 'mapbox',
			apiKey: 'mapbox-token',
		})
		expect(client).toBeInstanceOf(MapboxProvider)
	})

	it('returns an instance of OpenStreetMapProvider when provider is "openstreetmap"', () => {
		const client = createMapClient({
			provider: 'openstreetmap',
			apiKey: 'MyApp/1.0',
		})
		expect(client).toBeInstanceOf(OpenStreetMapProvider)
	})

	it('returns an instance of OsmProvider when provider is "osm"', () => {
		const client = createMapClient({
			provider: 'osm',
			apiKey: '',
		})
		expect(client).toBeInstanceOf(OsmProvider)
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

	it('getRoute throws NotImplemented for Google provider', async () => {
		const client = createMapClient({
			provider: 'google',
			apiKey: 'test-key',
		})
		await expect(
			client.getRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 })
		).rejects.toThrow('NotImplemented: getRoute')
	})
})
