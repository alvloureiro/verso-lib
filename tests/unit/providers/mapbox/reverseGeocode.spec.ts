import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MapboxProvider } from '@/providers/mapbox'
import { MemoryCache } from '@/cache/memory.cache'
import type { HttpClient } from '@/http/http-client'

describe('MapboxProvider - reverseGeocode', () => {
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

	it('should return address for valid coordinates', async () => {
		const mockResponse = {
			type: 'FeatureCollection',
			query: [-46.655625, -23.561737],
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

		const result = await provider.reverseGeocode(
			-23.561737,
			-46.655625
		)

		expect(result).toMatchObject({
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
			coordinates: { lat: -23.561737, lng: -46.655625 },
			placeId: 'address.123',
			locationType: 'rooftop',
		})
		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/-46.655625,-23.561737.json',
			method: 'GET',
			params: expect.objectContaining({
				access_token: 'fake-token',
				limit: '1',
			}),
		})
	})

	it('should use longitude,latitude order in URL', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: [10, 20],
			features: [
				{
					id: 'a.1',
					type: 'Feature',
					place_type: ['address'],
					relevance: 1,
					properties: {},
					text: 'Some',
					place_name: 'Some Place',
					center: [10, 20],
					geometry: { type: 'Point', coordinates: [10, 20] },
					context: [],
				},
			],
			attribution: '...',
		})

		await provider.reverseGeocode(20, 10)

		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/10,20.json',
			method: 'GET',
			params: expect.any(Object),
		})
	})

	it('should throw when no features returned', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: [0, 0],
			features: [],
			attribution: '...',
		})

		await expect(provider.reverseGeocode(0, 0)).rejects.toThrow(
			'No address found for the given coordinates'
		)
	})

	it('should respect language option', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: [-46.63, -23.55],
			features: [
				{
					id: 'a.1',
					type: 'Feature',
					place_type: ['address'],
					relevance: 1,
					properties: {},
					text: 'Rua',
					place_name: 'Rua Teste',
					center: [-46.63, -23.55],
					geometry: { type: 'Point', coordinates: [-46.63, -23.55] },
					context: [],
				},
			],
			attribution: '...',
		})

		await provider.reverseGeocode(-23.55, -46.63, { language: 'pt' })

		expect(httpClient.request).toHaveBeenCalledWith({
			url: expect.any(String),
			method: 'GET',
			params: expect.objectContaining({
				language: 'pt',
			}),
		})
	})

	it('should cache results for subsequent identical requests', async () => {
		const mockResponse = {
			type: 'FeatureCollection',
			query: [1, 2],
			features: [
				{
					id: 'a.1',
					type: 'Feature',
					place_type: ['address'],
					relevance: 1,
					properties: { accuracy: 'street' },
					text: 'Cached',
					place_name: 'Cached Address',
					center: [2, 1],
					geometry: { type: 'Point', coordinates: [2, 1] },
					context: [],
				},
			],
			attribution: '...',
		}
		vi.mocked(httpClient.request).mockResolvedValue(mockResponse)

		const result1 = await provider.reverseGeocode(1, 2)
		const result2 = await provider.reverseGeocode(1, 2)

		expect(result1.address.formattedAddress).toBe('Cached Address')
		expect(result2.address.formattedAddress).toBe('Cached Address')
		expect(httpClient.request).toHaveBeenCalledTimes(1)
	})

	it('should use APPROXIMATE when properties.accuracy is missing', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: [0, 0],
			features: [
				{
					id: 'a.1',
					type: 'Feature',
					place_type: ['place'],
					relevance: 1,
					properties: {},
					text: 'Place',
					place_name: 'Some Place',
					center: [0, 0],
					geometry: { type: 'Point', coordinates: [0, 0] },
					context: [],
				},
			],
			attribution: '...',
		})

		const result = await provider.reverseGeocode(0, 0)
		expect(result.locationType).toBe('APPROXIMATE')
	})
})
