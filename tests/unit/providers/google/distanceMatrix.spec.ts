import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoogleMapsProvider } from '@/providers/google'
import { MemoryCache } from '@/cache/memory.cache'

describe('GoogleMapsProvider - getDistanceMatrix', () => {
	let provider: GoogleMapsProvider
	let cache: MemoryCache

	beforeEach(() => {
		cache = new MemoryCache()
		provider = new GoogleMapsProvider('fake-api-key', cache, {
			timeout: 5000,
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
		expect(emptyOrigins.destinations).toEqual([{ lat: 1, lng: 1 }])

		const emptyDests = await provider.getDistanceMatrix(
			[{ lat: 0, lng: 0 }],
			[]
		)
		expect(emptyDests.rows).toEqual([])
		expect(emptyDests.destinations).toEqual([])
	})

	it('returns matrix with correct structure and values on success', async () => {
		const mockResponse = {
			status: 'OK',
			origin_addresses: ['Origin 1'],
			destination_addresses: ['Dest 1', 'Dest 2'],
			rows: [
				{
					elements: [
						{
							status: 'OK',
							distance: { text: '5.2 km', value: 5200 },
							duration: { text: '12 mins', value: 720 },
						},
						{
							status: 'OK',
							distance: { text: '10.1 km', value: 10100 },
							duration: { text: '24 mins', value: 1440 },
						},
					],
				},
			],
		}

		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue(mockResponse)

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
		expect(result.rows[0][0]).toEqual({
			distance: { text: '5.2 km', value: 5200 },
			duration: { text: '12 mins', value: 720 },
			status: 'OK',
		})
		expect(result.rows[0][1]).toEqual({
			distance: { text: '10.1 km', value: 10100 },
			duration: { text: '24 mins', value: 1440 },
			status: 'OK',
		})
	})

	it('includes mode, avoid, and language in request params', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			status: 'OK',
			rows: [
				{
					elements: [
						{
							status: 'OK',
							distance: { text: '0 km', value: 0 },
							duration: { text: '0 mins', value: 0 },
						},
					],
				},
			],
		})

		await provider.getDistanceMatrix(
			[{ lat: 0, lng: 0 }],
			[{ lat: 1, lng: 1 }],
			{
				mode: 'walking',
				avoid: ['tolls', 'highways'],
				language: 'pt-BR',
			}
		)

		expect(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).toHaveBeenCalledWith({
			url: '/distancematrix/json',
			method: 'GET',
			params: expect.objectContaining({
				mode: 'walking',
				avoid: 'tolls|highways',
				language: 'pt-BR',
				units: 'metric',
			}),
		})
	})

	it('maps element status NOT_FOUND and ZERO_RESULTS correctly', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			status: 'OK',
			rows: [
				{
					elements: [
						{ status: 'OK', distance: { text: '0 km', value: 0 }, duration: { text: '0 mins', value: 0 } },
						{ status: 'ZERO_RESULTS' },
						{ status: 'NOT_FOUND' },
					],
				},
			],
		})

		const result = await provider.getDistanceMatrix(
			[{ lat: 0, lng: 0 }],
			[
				{ lat: 1, lng: 1 },
				{ lat: 2, lng: 2 },
				{ lat: 3, lng: 3 },
			]
		)

		expect(result.rows[0][0].status).toBe('OK')
		expect(result.rows[0][1].status).toBe('ZERO_RESULTS')
		expect(result.rows[0][2].status).toBe('NOT_FOUND')
	})

	it('returns cached result on second call (no API hit)', async () => {
		const mockResponse = {
			status: 'OK',
			rows: [
				{
					elements: [
						{
							status: 'OK',
							distance: { text: '1 km', value: 1000 },
							duration: { text: '5 mins', value: 300 },
						},
					],
				},
			],
		}
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue(mockResponse)

		const origins = [{ lat: -23.55, lng: -46.63 }]
		const destinations = [{ lat: -23.56, lng: -46.64 }]

		await provider.getDistanceMatrix(origins, destinations)
		await provider.getDistanceMatrix(origins, destinations)

		expect(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).toHaveBeenCalledTimes(1)
	})

	it('throws when API returns non-OK status', async () => {
		vi.mocked(
			(provider as { httpClient: { request: ReturnType<typeof vi.fn> } })
				.httpClient.request
		).mockResolvedValue({
			status: 'REQUEST_DENIED',
			error_message: 'API key invalid',
		})

		await expect(
			provider.getDistanceMatrix(
				[{ lat: 0, lng: 0 }],
				[{ lat: 1, lng: 1 }]
			)
		).rejects.toThrow('Distance Matrix API error: REQUEST_DENIED')
	})

	it('throws on network/HTTP error', async () => {
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
