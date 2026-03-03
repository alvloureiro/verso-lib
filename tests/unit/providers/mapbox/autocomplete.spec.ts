import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MapboxProvider } from '@/providers/mapbox'
import { MemoryCache } from '@/cache/memory.cache'
import type { HttpClient } from '@/http/http-client'

describe('MapboxProvider - autocomplete', () => {
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

	it('should return predictions for valid input', async () => {
		const mockResponse = {
			type: 'FeatureCollection',
			query: ['Av. Paulista'],
			features: [
				{
					id: 'address.123',
					type: 'Feature',
					place_type: ['address'],
					relevance: 1,
					properties: {},
					text: 'Av. Paulista, 1000',
					place_name:
						'Av. Paulista, 1000 - São Paulo, SP, Brazil',
					center: [-46.655625, -23.561737],
					geometry: {
						type: 'Point',
						coordinates: [-46.655625, -23.561737],
					},
					context: [],
				},
			],
			attribution: '...',
		}

		vi.mocked(httpClient.request).mockResolvedValue(mockResponse)

		const predictions = await provider.autocomplete('Av. Paulista')

		expect(predictions).toHaveLength(1)
		expect(predictions[0]).toMatchObject({
			description: 'Av. Paulista, 1000 - São Paulo, SP, Brazil',
			placeId: 'address.123',
		})
		expect(predictions[0].structuredFormatting).toBeUndefined()
		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/Av.%20Paulista.json',
			method: 'GET',
			params: expect.objectContaining({
				access_token: 'fake-token',
				types: 'address,poi',
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

	it('should return empty array when no features in response', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['xyz'],
			features: [],
			attribution: '...',
		})

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
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['Rua'],
			features: [],
			attribution: '...',
		})

		await provider.autocomplete('Rua', {
			language: 'pt',
			components: { country: 'br' },
		})

		expect(httpClient.request).toHaveBeenCalledWith({
			url: expect.any(String),
			method: 'GET',
			params: expect.objectContaining({
				language: 'pt',
				country: 'br',
				types: 'address,poi',
			}),
		})
	})

	it('should pass custom types option', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['Park'],
			features: [],
			attribution: '...',
		})

		await provider.autocomplete('Park', { types: 'poi' })

		expect(httpClient.request).toHaveBeenCalledWith({
			url: expect.any(String),
			method: 'GET',
			params: expect.objectContaining({
				types: 'poi',
			}),
		})
	})

	it('should pass proximity when location option is provided', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['Rua'],
			features: [],
			attribution: '...',
		})

		await provider.autocomplete('Rua', {
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

	it('should pass multiple countries when components.country is array', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['Rua'],
			features: [],
			attribution: '...',
		})

		await provider.autocomplete('Rua', {
			components: { country: ['br', 'pt'] },
		})

		expect(httpClient.request).toHaveBeenCalledWith({
			url: expect.any(String),
			method: 'GET',
			params: expect.objectContaining({
				country: 'br,pt',
			}),
		})
	})

	it('should use matching_text for mainText when available', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			type: 'FeatureCollection',
			query: ['Paul'],
			features: [
				{
					id: 'poi.1',
					type: 'Feature',
					place_type: ['poi'],
					relevance: 1,
					properties: {},
					text: 'Paulista Mall',
					place_name: 'Paulista Mall, São Paulo, Brazil',
					matching_text: 'Paulista',
					matching_place_name: 'Paulista Mall',
					center: [0, 0],
					geometry: { type: 'Point', coordinates: [0, 0] },
					context: [],
				},
			],
			attribution: '...',
		})

		const predictions = await provider.autocomplete('Paul')
		expect(predictions[0].structuredFormatting?.mainText).toBe('Paulista')
	})
})
