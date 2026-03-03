import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenStreetMapProvider } from '@/providers/openstreetmap'
import { MemoryCache } from '@/cache/memory.cache'
import type { HttpClient } from '@/http/http-client'

describe('OpenStreetMapProvider - autocomplete', () => {
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

	it('should return predictions for valid input', async () => {
		const mockResponse = [
			{
				place_id: 123456,
				osm_type: 'way',
				osm_id: 1,
				lat: '-23.561737',
				lon: '-46.655625',
				display_name: 'Av. Paulista, 1000 - São Paulo, SP, Brazil',
				address: {
					road: 'Av. Paulista',
					city: 'São Paulo',
					state: 'SP',
					country: 'Brazil',
				},
			},
		]

		vi.mocked(httpClient.request).mockResolvedValue(mockResponse)

		const predictions = await provider.autocomplete('Av. Paulista')

		expect(predictions).toHaveLength(1)
		expect(predictions[0]).toMatchObject({
			description: 'Av. Paulista, 1000 - São Paulo, SP, Brazil',
			placeId: '123456',
		})
		expect(predictions[0].structuredFormatting?.mainText).toBe('Av. Paulista')
		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/search',
			method: 'GET',
			params: expect.objectContaining({
				format: 'jsonv2',
				addressdetails: '1',
				q: 'Av. Paulista',
				limit: '5',
			}),
		})
	})

	it('should return empty array for empty input', async () => {
		const predictions = await provider.autocomplete('')
		expect(predictions).toEqual([])
		expect(httpClient.request).not.toHaveBeenCalled()
	})

	it('should return empty array for whitespace-only input', async () => {
		const predictions = await provider.autocomplete('   ')
		expect(predictions).toEqual([])
		expect(httpClient.request).not.toHaveBeenCalled()
	})

	it('should return empty array when no results', async () => {
		vi.mocked(httpClient.request).mockResolvedValue([])

		const predictions = await provider.autocomplete('xyz')
		expect(predictions).toEqual([])
	})

	it('should return empty array on HTTP error', async () => {
		vi.mocked(httpClient.request).mockRejectedValue(
			new Error('Network error')
		)

		const predictions = await provider.autocomplete('test')
		expect(predictions).toEqual([])
	})

	it('should pass language and country options', async () => {
		vi.mocked(httpClient.request).mockResolvedValue([])

		await provider.autocomplete('Rua', {
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

	it('should pass multiple countries when components.country is array', async () => {
		vi.mocked(httpClient.request).mockResolvedValue([])

		await provider.autocomplete('Rua', {
			components: { country: ['br', 'pt'] },
		})

		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/search',
			method: 'GET',
			params: expect.objectContaining({
				countrycodes: 'br,pt',
			}),
		})
	})
})
