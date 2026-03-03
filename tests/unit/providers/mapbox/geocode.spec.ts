import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MapboxProvider } from '@/providers/mapbox'
import { MemoryCache } from '@/cache/memory.cache'
import type { HttpClient } from '@/http/http-client'

describe('MapboxProvider - geocode', () => {
	let provider: MapboxProvider
	let httpClient: HttpClient

	beforeEach(() => {
		const cache = new MemoryCache()
		provider = new MapboxProvider({
			accessToken: 'fake-token',
			cache,
			httpConfig: { timeout: 5000 },
		})
		httpClient = (provider as { httpClient: HttpClient }).httpClient
		vi.spyOn(httpClient, 'request')
	})

	it('should return geocoding results for a valid address', async () => {
		const mockResponse = {
			type: 'FeatureCollection',
			query: ['av', 'paulista'],
			features: [
				{
					id: 'address.123',
					type: 'Feature',
					place_type: ['address'],
					relevance: 1,
					properties: { accuracy: 'rooftop' },
					text: 'Av. Paulista',
					place_name:
						'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, Brazil',
					center: [-46.655625, -23.561737],
					geometry: {
						type: 'Point',
						coordinates: [-46.655625, -23.561737],
					},
					address: '1000',
					context: [
						{ id: 'neighborhood.123', text: 'Bela Vista' },
						{ id: 'place.456', text: 'São Paulo' },
						{ id: 'region.789', text: 'SP', short_code: 'SP' },
						{ id: 'country.101', text: 'Brazil', short_code: 'br' },
						{ id: 'postcode.112', text: '01310-100' },
					],
				},
			],
			attribution: '...',
		}

		vi.mocked(httpClient.request).mockResolvedValue(mockResponse)

		const results = await provider.geocode('Av. Paulista, 1000')

		expect(results).toHaveLength(1)
		expect(results[0]).toMatchObject({
			coordinates: { lat: -23.561737, lng: -46.655625 },
			address: {
				formattedAddress:
					'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, Brazil',
				street: 'Av. Paulista',
				number: '1000',
				neighborhood: 'Bela Vista',
				city: 'São Paulo',
				state: 'SP',
				country: 'Brazil',
				postalCode: '01310-100',
				placeId: 'address.123',
			},
			placeId: 'address.123',
		})
		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/Av.%20Paulista%2C%201000.json',
			method: 'GET',
			params: expect.objectContaining({
				access_token: 'fake-token',
				limit: '5',
			}),
		})
	})

	it('should return empty array for empty input', async () => {
		const results = await provider.geocode('')
		expect(results).toEqual([])
		expect(httpClient.request).not.toHaveBeenCalled()
	})

	it('should return empty array for whitespace-only input', async () => {
		const results = await provider.geocode('   ')
		expect(results).toEqual([])
		expect(httpClient.request).not.toHaveBeenCalled()
	})

	it('should return empty array when no features in response', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['unknown'],
			features: [],
			attribution: '...',
		})

		const results = await provider.geocode('Unknown Place')
		expect(results).toEqual([])
	})

	it('should respect language and country options', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['rua'],
			features: [],
			attribution: '...',
		})

		await provider.geocode('Rua Augusta', {
			language: 'pt',
			components: { country: 'br' },
		})

		expect(httpClient.request).toHaveBeenCalledWith({
			url: expect.any(String),
			method: 'GET',
			params: expect.objectContaining({
				access_token: 'fake-token',
				language: 'pt',
				country: 'br',
			}),
		})
	})

	it('should pass proximity when location option is provided', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['rua'],
			features: [],
			attribution: '...',
		})

		await provider.geocode('Rua Augusta', {
			location: { lat: -23.55, lng: -46.63 },
		})

		expect(httpClient.request).toHaveBeenCalledWith({
			url: expect.any(String),
			method: 'GET',
			params: expect.objectContaining({
				proximity: '-46.63,-23.55',
			}),
		})
	})

	it('should cache results for subsequent identical requests', async () => {
		const mockResponse = {
			type: 'FeatureCollection',
			query: ['test'],
			features: [
				{
					id: 'addr.1',
					type: 'Feature',
					place_type: ['address'],
					relevance: 1,
					properties: {},
					text: 'Test',
					place_name: 'Test Street, City',
					center: [0, 0],
					geometry: { type: 'Point', coordinates: [0, 0] },
					context: [],
				},
			],
			attribution: '...',
		}
		vi.mocked(httpClient.request).mockResolvedValue(mockResponse)

		const results1 = await provider.geocode('Test Street')
		const results2 = await provider.geocode('Test Street')

		expect(results1).toHaveLength(1)
		expect(results2).toHaveLength(1)
		expect(httpClient.request).toHaveBeenCalledTimes(1)
	})

	it('should return empty array on HTTP error', async () => {
		vi.mocked(httpClient.request).mockRejectedValue(
			new Error('Network error')
		)

		const results = await provider.geocode('Any Address')
		expect(results).toEqual([])
	})

	it('should set partialMatch when relevance is below 0.9', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['partial'],
			features: [
				{
					id: 'addr.partial',
					type: 'Feature',
					place_type: ['address'],
					relevance: 0.7,
					properties: {},
					text: 'Partial',
					place_name: 'Partial Match',
					center: [0, 0],
					geometry: { type: 'Point', coordinates: [0, 0] },
					context: [],
				},
			],
			attribution: '...',
		})

		const results = await provider.geocode('Partial')
		expect(results[0].partialMatch).toBe(true)
	})
})
