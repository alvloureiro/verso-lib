import { describe, it, expect, beforeEach } from 'vitest'
import { MapboxProvider } from '@/providers/mapbox'
import { MemoryCache } from '@/cache/memory.cache'

describe('MapboxProvider - getRoute', () => {
	let provider: MapboxProvider

	beforeEach(() => {
		provider = new MapboxProvider({
			accessToken: 'fake-token',
			cache: new MemoryCache(),
		})
	})

	it('getRoute returns stub route with bounds', async () => {
		const origin = { lat: -23.55, lng: -46.63 }
		const destination = { lat: -23.56, lng: -46.64 }
		const result = await provider.getRoute(origin, destination)
		expect(result.summary).toBe('')
		expect(result.distance).toEqual({ text: '0 km', value: 0 })
		expect(result.duration).toEqual({ text: '0 mins', value: 0 })
		expect(result.polyline).toBe('')
		expect(result.steps).toEqual([])
		expect(result.bounds.northeast).toEqual({
			lat: -23.55,
			lng: -46.63,
		})
		expect(result.bounds.southwest).toEqual({
			lat: -23.56,
			lng: -46.64,
		})
	})
})
