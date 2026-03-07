import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OsmProvider } from '@/providers/osm'
import { MemoryCache } from '@/cache/memory.cache'

describe('OsmProvider - getDistanceMatrix', () => {
	let provider: OsmProvider
	let cache: MemoryCache

	beforeEach(() => {
		cache = new MemoryCache()
		provider = new OsmProvider({ cache })
		vi.spyOn(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient,
			'request'
		)
	})

	it('returns empty matrix when origins or destinations are empty', async () => {
		const emptyOrigins = await provider.getDistanceMatrix(
			[],
			[{ lat: 1, lng: 1 }]
		)
		expect(emptyOrigins.rows).toEqual([])
		expect(emptyOrigins.origins).toEqual([])

		const emptyDests = await provider.getDistanceMatrix(
			[{ lat: 0, lng: 0 }],
			[]
		)
		expect(emptyDests.rows).toEqual([])
		expect(emptyDests.destinations).toEqual([])
	})

	it('returns matrix with correct structure and values on success', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			code: 'Ok',
			durations: [[0, 720, 1440]],
			distances: [[0, 5200, 10100]],
		})

		const origins = [{ lat: -23.55, lng: -46.63 }]
		const destinations = [
			{ lat: -23.56, lng: -46.64 },
			{ lat: -23.57, lng: -46.65 },
		]
		const result = await provider.getDistanceMatrix(origins, destinations)

		expect(result.origins).toEqual(origins)
		expect(result.destinations).toEqual(destinations)
		expect(result.rows).toHaveLength(1)
		expect(result.rows[0]).toHaveLength(2)
		expect(result.rows[0][0].status).toBe('OK')
		expect(result.rows[0][0].distance.value).toBe(0)
		expect(result.rows[0][0].duration.value).toBe(0)
		expect(result.rows[0][1].status).toBe('OK')
		expect(result.rows[0][1].distance.value).toBe(5200)
		expect(result.rows[0][1].duration.value).toBe(720)
	})

	it('sends coordinates as lng,lat and sources/destinations indices', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			code: 'Ok',
			durations: [[0]],
			distances: [[0]],
		})

		await provider.getDistanceMatrix(
			[{ lat: -23.55, lng: -46.63 }],
			[{ lat: -23.56, lng: -46.64 }]
		)

		const call = vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mock.calls[0][0]
		expect(call.url).toContain('/car/')
		expect(call.url).toContain('-46.63,-23.55')
		expect(call.url).toContain('-46.64,-23.56')
		expect(call.params?.annotations).toBe('distance,duration')
		expect(call.params?.sources).toBe('0')
		expect(call.params?.destinations).toBe('1')
	})

	it('maps mode to OSRM profile (foot, bike, car)', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			code: 'Ok',
			durations: [[0]],
			distances: [[0]],
		})

		await provider.getDistanceMatrix(
			[{ lat: 0, lng: 0 }],
			[{ lat: 1, lng: 1 }],
			{ mode: 'walking' }
		)
		expect(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).toHaveBeenCalledWith(
			expect.objectContaining({
				url: expect.stringContaining('/foot/'),
			})
		)

		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockClear()
		await provider.getDistanceMatrix(
			[{ lat: 0, lng: 0 }],
			[{ lat: 1, lng: 1 }],
			{ mode: 'bicycling' }
		)
		expect(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).toHaveBeenCalledWith(
			expect.objectContaining({
				url: expect.stringContaining('/bike/'),
			})
		)
	})

	it('sets NOT_FOUND for null duration/distance', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			code: 'Ok',
			durations: [[100, null]],
			distances: [[500, null]],
		})

		const result = await provider.getDistanceMatrix(
			[{ lat: 0, lng: 0 }],
			[{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }]
		)

		expect(result.rows[0][0].status).toBe('OK')
		expect(result.rows[0][1].status).toBe('NOT_FOUND')
	})

	it('returns cached result on second call (no API hit)', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			code: 'Ok',
			durations: [[300]],
			distances: [[5000]],
		})

		const origins = [{ lat: -23.55, lng: -46.63 }]
		const destinations = [{ lat: -23.56, lng: -46.64 }]

		await provider.getDistanceMatrix(origins, destinations)
		await provider.getDistanceMatrix(origins, destinations)

		expect(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).toHaveBeenCalledTimes(1)
	})

	it('throws when OSRM returns code other than Ok', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			code: 'NoSegment',
			message: 'Could not find a matching segment',
		})

		await expect(
			provider.getDistanceMatrix(
				[{ lat: 0, lng: 0 }],
				[{ lat: 1, lng: 1 }]
			)
		).rejects.toThrow('OSRM Table API error: NoSegment')
	})

	it('throws on network error', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockRejectedValue(new Error('Network error'))

		await expect(
			provider.getDistanceMatrix(
				[{ lat: 0, lng: 0 }],
				[{ lat: 1, lng: 1 }]
			)
		).rejects.toThrow('Network error')
	})

	it('throws NotImplemented for geocode, reverseGeocode, getRoute, autocomplete', async () => {
		await expect(provider.geocode('address')).rejects.toThrow(
			'NotImplemented: geocode'
		)
		await expect(provider.reverseGeocode(0, 0)).rejects.toThrow(
			'NotImplemented: reverseGeocode'
		)
		await expect(
			provider.getRoute({ lat: 0, lng: 0 }, { lat: 1, lng: 1 })
		).rejects.toThrow('NotImplemented: getRoute')
		await expect(provider.autocomplete('input')).rejects.toThrow(
			'NotImplemented: autocomplete'
		)
	})
})
