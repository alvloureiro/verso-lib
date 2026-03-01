import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoogleMapsProvider } from '../../../../src/providers/google'
import { MemoryCache } from '../../../../src/cache/memory.cache'

describe('GoogleMapsProvider - geocode', () => {
	let provider: GoogleMapsProvider
	let mockRequest: ReturnType<typeof vi.fn>
	let cache: MemoryCache

	beforeEach(() => {
		cache = new MemoryCache()
		provider = new GoogleMapsProvider('fake-api-key', cache, {
			timeout: 5000,
		})
		const httpClient = (provider as { httpClient: { request: typeof vi.fn } })
			.httpClient
		mockRequest = vi.fn()
		httpClient.request = mockRequest
	})

	it('should return geocoding results for a valid address', async () => {
		const mockResponse = {
			status: 'OK',
			results: [
				{
					formatted_address:
						'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100, Brazil',
					geometry: {
						location: { lat: -23.561737, lng: -46.655625 },
						bounds: {
							northeast: { lat: -23.56, lng: -46.65 },
							southwest: { lat: -23.563, lng: -46.66 },
						},
					},
					place_id: 'ChIJN1t_tDeuEmsRUrucRrwoX7k',
					address_components: [
						{
							long_name: '1000',
							short_name: '1000',
							types: ['street_number'],
						},
						{
							long_name: 'Avenida Paulista',
							short_name: 'Av. Paulista',
							types: ['route'],
						},
						{
							long_name: 'Bela Vista',
							short_name: 'Bela Vista',
							types: ['sublocality', 'political'],
						},
						{
							long_name: 'São Paulo',
							short_name: 'São Paulo',
							types: ['administrative_area_level_2', 'political'],
						},
						{
							long_name: 'SP',
							short_name: 'SP',
							types: ['administrative_area_level_1', 'political'],
						},
						{
							long_name: 'Brazil',
							short_name: 'BR',
							types: ['country', 'political'],
						},
						{
							long_name: '01310-100',
							short_name: '01310-100',
							types: ['postal_code'],
						},
					],
					partial_match: false,
				},
			],
		}

		mockRequest.mockResolvedValue(mockResponse)

		const results = await provider.geocode('Av. Paulista, 1000')

		expect(results).toHaveLength(1)
		expect(results[0]).toEqual({
			coordinates: { lat: -23.561737, lng: -46.655625 },
			address: {
				formattedAddress:
					'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100, Brazil',
				street: 'Avenida Paulista',
				number: '1000',
				neighborhood: 'Bela Vista',
				city: 'São Paulo',
				state: 'SP',
				country: 'Brazil',
				postalCode: '01310-100',
				placeId: 'ChIJN1t_tDeuEmsRUrucRrwoX7k',
			},
			placeId: 'ChIJN1t_tDeuEmsRUrucRrwoX7k',
			bounds: {
				northeast: { lat: -23.56, lng: -46.65 },
				southwest: { lat: -23.563, lng: -46.66 },
			},
			partialMatch: false,
		})
		expect(mockRequest).toHaveBeenCalledWith({
			url: '/geocode/json',
			method: 'GET',
			params: expect.objectContaining({
				address: 'Av. Paulista, 1000',
				key: 'fake-api-key',
			}),
		})
	})

	it('should return empty array when no results found', async () => {
		const mockResponse = {
			status: 'ZERO_RESULTS',
			results: [],
		}

		mockRequest.mockResolvedValue(mockResponse)

		const results = await provider.geocode('Invalid Address 12345')
		expect(results).toEqual([])
	})

	it('should cache results for subsequent identical requests', async () => {
		const mockResponse = {
			status: 'OK',
			results: [
				{
					formatted_address: 'Test Address',
					geometry: { location: { lat: 1, lng: 2 } },
					place_id: 'test123',
					address_components: [],
				},
			],
		}

		mockRequest.mockResolvedValue(mockResponse)

		const results1 = await provider.geocode('Same Address')
		expect(mockRequest).toHaveBeenCalledTimes(1)

		const results2 = await provider.geocode('Same Address')
		expect(mockRequest).toHaveBeenCalledTimes(1)
		expect(results1).toEqual(results2)
	})

	it('should respect region and language options', async () => {
		mockRequest.mockResolvedValue({
			status: 'ZERO_RESULTS',
			results: [],
		})

		await provider.geocode('Rua Augusta', {
			region: 'br',
			language: 'pt-BR',
		})

		expect(mockRequest).toHaveBeenCalledWith({
			url: '/geocode/json',
			method: 'GET',
			params: expect.objectContaining({
				address: 'Rua Augusta',
				region: 'br',
				language: 'pt-BR',
				key: 'fake-api-key',
			}),
		})
	})

	it('should throw on API error', async () => {
		mockRequest.mockRejectedValue(new Error('Network error'))

		await expect(provider.geocode('Any Address')).rejects.toThrow(
			'Network error'
		)
	})

	it('should handle partial matches correctly', async () => {
		const mockResponse = {
			status: 'OK',
			results: [
				{
					formatted_address: 'Partial Match Address',
					geometry: { location: { lat: 1, lng: 2 } },
					place_id: 'partial123',
					address_components: [],
					partial_match: true,
				},
			],
		}

		mockRequest.mockResolvedValue(mockResponse)

		const results = await provider.geocode('Partial Address')
		expect(results[0].partialMatch).toBe(true)
	})

	it('should handle bounds parameter correctly', async () => {
		mockRequest.mockResolvedValue({
			status: 'ZERO_RESULTS',
			results: [],
		})

		const bounds = {
			northeast: { lat: -23.5, lng: -46.5 },
			southwest: { lat: -23.6, lng: -46.7 },
		}

		await provider.geocode('Rua Augusta', { bounds })

		expect(mockRequest).toHaveBeenCalledWith({
			url: '/geocode/json',
			method: 'GET',
			params: expect.objectContaining({
				bounds: '-23.6,-46.7|-23.5,-46.5',
			}),
		})
	})

	it('should return empty array on HTTP 404', async () => {
		const { HttpError } = await import('../../../../src/http/types')
		mockRequest.mockRejectedValue(
			new HttpError('Not Found', {
				status: 404,
				statusText: 'Not Found',
				data: null,
				request: { url: '/geocode/json', method: 'GET' },
			})
		)

		const results = await provider.geocode('Unknown Place')
		expect(results).toEqual([])
	})

	it('should throw on non-OK API status', async () => {
		mockRequest.mockResolvedValue({
			status: 'REQUEST_DENIED',
			error_message: 'Invalid API key',
		})

		await expect(provider.geocode('Any Address')).rejects.toThrow(
			/Geocoding API error: REQUEST_DENIED/
		)
	})

	it('should pass components option when provided', async () => {
		mockRequest.mockResolvedValue({ status: 'ZERO_RESULTS', results: [] })

		await provider.geocode('Street', {
			components: { country: 'BR', postal_code: '01310-100' },
		})

		expect(mockRequest).toHaveBeenCalledWith({
			url: '/geocode/json',
			method: 'GET',
			params: expect.objectContaining({
				components: 'country:BR|postal_code:01310-100',
			}),
		})
	})

	it('should throw on malformed API response (missing geometry or place_id)', async () => {
		mockRequest.mockResolvedValue({
			status: 'OK',
			results: [
				{
					formatted_address: 'Some Address',
					geometry: {},
					place_id: 'id123',
					address_components: [],
				},
			],
		})

		await expect(provider.geocode('Address')).rejects.toThrow(
			/malformed result.*geometry\.location or place_id/
		)
	})

	it('should use same cache key for same options with different key order', async () => {
		mockRequest.mockResolvedValue({
			status: 'OK',
			results: [
				{
					formatted_address: 'Rua X',
					geometry: { location: { lat: 0, lng: 0 } },
					place_id: 'p1',
					address_components: [],
				},
			],
		})

		await provider.geocode('Rua X', { language: 'pt-BR', region: 'br' })
		expect(mockRequest).toHaveBeenCalledTimes(1)

		await provider.geocode('Rua X', { region: 'br', language: 'pt-BR' })
		expect(mockRequest).toHaveBeenCalledTimes(1)
	})
})
