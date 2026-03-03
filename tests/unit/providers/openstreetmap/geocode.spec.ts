import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenStreetMapProvider } from '@/providers/openstreetmap'
import { MemoryCache } from '@/cache/memory.cache'
import type { HttpClient } from '@/http/http-client'

describe('OpenStreetMapProvider - geocode', () => {
	let provider: OpenStreetMapProvider
	let httpClient: HttpClient

	beforeEach(() => {
		const cache = new MemoryCache()
		provider = new OpenStreetMapProvider({
			userAgent: 'TestApp/1.0',
			cache,
			httpConfig: { timeout: 5000 },
		})
		httpClient = (provider as { httpClient: HttpClient }).httpClient
		vi.spyOn(httpClient, 'request')
	})

	it('should return geocoding results for a valid address', async () => {
		const mockResponse = [
			{
				place_id: 123456,
				osm_type: 'way',
				osm_id: 1,
				lat: '-23.561737',
				lon: '-46.655625',
				display_name:
					'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, Brazil',
				address: {
					house_number: '1000',
					road: 'Av. Paulista',
					neighbourhood: 'Bela Vista',
					suburb: 'Bela Vista',
					city: 'São Paulo',
					state: 'SP',
					postcode: '01310-100',
					country: 'Brazil',
					country_code: 'br',
				},
				boundingbox: ['-23.57', '-23.55', '-46.66', '-46.64'],
			},
		]

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
				placeId: '123456',
			},
			placeId: '123456',
		})
		expect(results[0].bounds).toEqual({
			southwest: { lat: -23.57, lng: -46.66 },
			northeast: { lat: -23.55, lng: -46.64 },
		})
		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/search',
			method: 'GET',
			params: expect.objectContaining({
				format: 'jsonv2',
				addressdetails: '1',
				q: 'Av. Paulista, 1000',
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

	it('should return empty array when response is empty', async () => {
		vi.mocked(httpClient.request).mockResolvedValue([])

		const results = await provider.geocode('Unknown Place')
		expect(results).toEqual([])
	})

	it('should respect language and country options', async () => {
		vi.mocked(httpClient.request).mockResolvedValue([])

		await provider.geocode('Rua Augusta', {
			language: 'pt',
			components: { country: 'br' },
		})

		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/search',
			method: 'GET',
			params: expect.objectContaining({
				'accept-language': 'pt',
				countrycodes: 'br',
			}),
		})
	})

	it('should pass viewbox when location option is provided', async () => {
		vi.mocked(httpClient.request).mockResolvedValue([])

		await provider.geocode('Rua Augusta', {
			location: { lat: -23.55, lng: -46.63 },
		})

		const call = vi.mocked(httpClient.request).mock.calls[0][0]
		expect(call.params?.viewbox).toBeDefined()
		expect(call.params?.viewbox).toContain('-46.73')
		expect(call.params?.viewbox).toContain('-23.65')
		expect(call.params?.viewbox).toContain('-46.53')
		expect(call.params?.viewbox).toContain('-23.45')
	})

	it('should cache results for subsequent identical requests', async () => {
		vi.mocked(httpClient.request).mockResolvedValue([
			{
				place_id: 1,
				osm_type: 'node',
				osm_id: 1,
				lat: '0',
				lon: '0',
				display_name: 'Test',
				address: {},
			},
		])

		await provider.geocode('Test Street')
		await provider.geocode('Test Street')

		expect(httpClient.request).toHaveBeenCalledTimes(1)
	})

	it('should return empty array on HTTP error', async () => {
		vi.mocked(httpClient.request).mockRejectedValue(
			new Error('Network error')
		)

		const results = await provider.geocode('Any Address')
		expect(results).toEqual([])
	})

	it('should map village and town to city when city missing', async () => {
		vi.mocked(httpClient.request).mockResolvedValue([
			{
				place_id: 2,
				osm_type: 'way',
				osm_id: 2,
				lat: '52.5',
				lon: '-1.8',
				display_name: 'Pilkington Avenue, Birmingham, UK',
				address: {
					road: 'Pilkington Avenue',
					village: 'Wylde Green',
					town: 'Sutton Coldfield',
					city: 'Birmingham',
					country: 'United Kingdom',
				},
			},
		])

		const results = await provider.geocode('Pilkington Avenue')
		expect(results[0].address.city).toBe('Birmingham')
	})
})
