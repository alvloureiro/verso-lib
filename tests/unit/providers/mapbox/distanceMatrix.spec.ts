import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MapboxProvider } from '@/providers/mapbox'
import { MemoryCache } from '@/cache/memory.cache'

describe('MapboxProvider - getDistanceMatrix', () => {
	let provider: MapboxProvider
	let cache: MemoryCache

	beforeEach(() => {
		cache = new MemoryCache()
		provider = new MapboxProvider({
			accessToken: 'fake-token',
			cache,
		})
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
			durations: [[0, 573, 1169.5]],
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
		expect(result.rows[0][1].duration.value).toBe(573)
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

	it('uses driving profile by default and passes annotations', async () => {
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
		expect(call.url).toContain('/driving/')
		expect(call.params?.annotations).toBe('distance,duration')
		expect(call.params?.sources).toBe('0')
		expect(call.params?.destinations).toBe('1')
	})

	it('maps mode to Mapbox profile (walking, cycling)', async () => {
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
				url: expect.stringContaining('/walking/'),
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
				url: expect.stringContaining('/cycling/'),
			})
		)
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

	it('throws when API returns code other than Ok', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			code: 'InvalidInput',
			message: 'Invalid coordinates',
		})

		await expect(
			provider.getDistanceMatrix(
				[{ lat: 0, lng: 0 }],
				[{ lat: 1, lng: 1 }]
			)
		).rejects.toThrow('Mapbox Matrix API error: InvalidInput')
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
})
