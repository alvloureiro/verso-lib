import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenStreetMapProvider } from '@/providers/openstreetmap'
import { MemoryCache } from '@/cache/memory.cache'
import type { HttpClient } from '@/http/http-client'

describe('OpenStreetMapProvider - reverseGeocode', () => {
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

	it('should return address for valid coordinates', async () => {
		const mockResponse = {
			place_id: 123456,
			osm_type: 'way',
			osm_id: 1,
			lat: '-23.561737',
			lon: '-46.655625',
			display_name:
				'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, Brazil',
			category: 'building',
			type: 'residential',
			address: {
				house_number: '1000',
				road: 'Av. Paulista',
				neighbourhood: 'Bela Vista',
				city: 'São Paulo',
				state: 'SP',
				postcode: '01310-100',
				country: 'Brazil',
				country_code: 'br',
			},
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
				placeId: '123456',
			},
			coordinates: { lat: -23.561737, lng: -46.655625 },
			placeId: '123456',
			locationType: 'building',
		})
		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/reverse',
			method: 'GET',
			params: expect.objectContaining({
				format: 'jsonv2',
				addressdetails: '1',
				lat: '-23.561737',
				lon: '-46.655625',
			}),
		})
	})

	it('should throw when response is invalid', async () => {
		vi.mocked(httpClient.request).mockResolvedValue(null)

		await expect(
			provider.reverseGeocode(0, 0)
		).rejects.toThrow('No address found for the given coordinates')
	})

	it('should respect language option', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			place_id: 1,
			osm_type: 'node',
			osm_id: 1,
			lat: '0',
			lon: '0',
			display_name: 'Test',
			address: {},
		})

		await provider.reverseGeocode(-23.55, -46.63, { language: 'pt' })

		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/reverse',
			method: 'GET',
			params: expect.objectContaining({
				'accept-language': 'pt',
			}),
		})
	})

	it('should cache results for subsequent identical requests', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			place_id: 1,
			osm_type: 'node',
			osm_id: 1,
			lat: '1',
			lon: '2',
			display_name: 'Cached Address',
			address: {},
		})

		const result1 = await provider.reverseGeocode(1, 2)
		const result2 = await provider.reverseGeocode(1, 2)

		expect(result1.address.formattedAddress).toBe('Cached Address')
		expect(result2.address.formattedAddress).toBe('Cached Address')
		expect(httpClient.request).toHaveBeenCalledTimes(1)
	})

	it('should use category or type as locationType', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			place_id: 1,
			osm_type: 'way',
			osm_id: 1,
			lat: '0',
			lon: '0',
			display_name: 'Road',
			type: 'highway',
			address: {},
		})

		const result = await provider.reverseGeocode(0, 0)
		expect(result.locationType).toBe('highway')
	})
})
