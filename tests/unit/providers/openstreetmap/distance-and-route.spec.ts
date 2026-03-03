import { describe, it, expect, beforeEach } from 'vitest'
import { OpenStreetMapProvider } from '@/providers/openstreetmap'
import { MemoryCache } from '@/cache/memory.cache'

describe('OpenStreetMapProvider - getDistanceMatrix and getRoute', () => {
	let provider: OpenStreetMapProvider

	beforeEach(() => {
		provider = new OpenStreetMapProvider({
			userAgent: 'TestApp/1.0',
			cache: new MemoryCache(),
		})
	})

	it('getDistanceMatrix returns stub matrix with ZERO_RESULTS', async () => {
		const origins = [{ lat: 0, lng: 0 }]
		const destinations = [{ lat: 1, lng: 1 }]
		const result = await provider.getDistanceMatrix(
			origins,
			destinations
		)
		expect(result.origins).toEqual(origins)
		expect(result.destinations).toEqual(destinations)
		expect(result.rows[0][0].status).toBe('ZERO_RESULTS')
	})

	it('getRoute returns stub route with bounds', async () => {
		const origin = { lat: -23.55, lng: -46.63 }
		const destination = { lat: -23.56, lng: -46.64 }
		const result = await provider.getRoute(origin, destination)
		expect(result.bounds.northeast).toEqual({ lat: -23.55, lng: -46.63 })
		expect(result.bounds.southwest).toEqual({ lat: -23.56, lng: -46.64 })
	})
})
