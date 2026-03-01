import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoogleMapsProvider } from '@/providers/google'
import { MemoryCache } from '@/cache/memory.cache'

describe('GoogleMapsProvider - reverseGeocode', () => {
	let provider: GoogleMapsProvider
	let cache: MemoryCache

	beforeEach(() => {
		cache = new MemoryCache()
		provider = new GoogleMapsProvider('fake-api-key', cache, {
			timeout: 5000,
		})
		const httpClient = (provider as { httpClient: { request: typeof vi.fn } })
			.httpClient
		vi.spyOn(httpClient, 'request')
	})

	it('should return address for valid coordinates', async () => {
		const mockResponse = {
			status: 'OK',
			results: [
				{
					formatted_address:
						'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100, Brazil',
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
					geometry: {
						location: { lat: -23.561737, lng: -46.655625 },
						location_type: 'ROOFTOP',
					},
				},
			],
		}

		vi.mocked(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).mockResolvedValue(mockResponse)

		const result = await provider.reverseGeocode(
			-23.561737,
			-46.655625
		)

		expect(result).toEqual({
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
			coordinates: { lat: -23.561737, lng: -46.655625 },
			placeId: 'ChIJN1t_tDeuEmsRUrucRrwoX7k',
			locationType: 'ROOFTOP',
		})
		expect(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).toHaveBeenCalledWith({
			url: '/geocode/json',
			method: 'GET',
			params: expect.objectContaining({
				latlng: '-23.561737,-46.655625',
				key: 'fake-api-key',
			}),
		})
	})

	it('should throw error when no results found', async () => {
		const mockResponse = {
			status: 'ZERO_RESULTS',
			results: [],
		}

		vi.mocked(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).mockResolvedValue(mockResponse)

		await expect(provider.reverseGeocode(0, 0)).rejects.toThrow(
			'No address found for the given coordinates'
		)
	})

	it('should throw error on API error', async () => {
		const mockResponse = {
			status: 'REQUEST_DENIED',
			error_message: 'API key invalid',
		}

		vi.mocked(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).mockResolvedValue(mockResponse)

		await expect(provider.reverseGeocode(0, 0)).rejects.toThrow(
			'Reverse geocoding API error: REQUEST_DENIED - API key invalid'
		)
	})

	it('should cache results for subsequent identical requests', async () => {
		const mockResponse = {
			status: 'OK',
			results: [
				{
					formatted_address: 'Test Address',
					place_id: 'test123',
					address_components: [],
					geometry: {
						location: { lat: 1, lng: 2 },
						location_type: 'APPROXIMATE',
					},
				},
			],
		}

		vi.mocked(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).mockResolvedValue(mockResponse)

		const result1 = await provider.reverseGeocode(1.23456, -2.34567)
		expect(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).toHaveBeenCalledTimes(1)

		const result2 = await provider.reverseGeocode(1.23456, -2.34567)
		expect(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).toHaveBeenCalledTimes(1)

		expect(result1).toEqual(result2)
	})

	it('should respect language option', async () => {
		vi.mocked(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).mockResolvedValue({ status: 'ZERO_RESULTS', results: [] })

		await provider
			.reverseGeocode(-23.55, -46.63, { language: 'pt-BR' })
			.catch(() => {})

		expect(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).toHaveBeenCalledWith({
			url: '/geocode/json',
			method: 'GET',
			params: expect.objectContaining({
				language: 'pt-BR',
			}),
		})
	})

	it('should respect resultType option', async () => {
		vi.mocked(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).mockResolvedValue({ status: 'ZERO_RESULTS', results: [] })

		await provider
			.reverseGeocode(-23.55, -46.63, {
				resultType: ['street_address', 'route'],
			})
			.catch(() => {})

		expect(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).toHaveBeenCalledWith({
			url: '/geocode/json',
			method: 'GET',
			params: expect.objectContaining({
				result_type: 'street_address|route',
			}),
		})
	})

	it('should respect locationType option', async () => {
		vi.mocked(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).mockResolvedValue({ status: 'ZERO_RESULTS', results: [] })

		await provider
			.reverseGeocode(-23.55, -46.63, {
				locationType: ['ROOFTOP', 'RANGE_INTERPOLATED'],
			})
			.catch(() => {})

		expect(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).toHaveBeenCalledWith({
			url: '/geocode/json',
			method: 'GET',
			params: expect.objectContaining({
				location_type: 'ROOFTOP|RANGE_INTERPOLATED',
			}),
		})
	})

	it('should round coordinates for cache key to avoid excessive keys', async () => {
		const mockResponse = {
			status: 'OK',
			results: [
				{
					formatted_address: 'Test',
					place_id: 'test',
					address_components: [],
					geometry: {
						location: { lat: 0, lng: 0 },
						location_type: 'APPROXIMATE',
					},
				},
			],
		}
		vi.mocked(
			(provider as { httpClient: { request: typeof vi.fn } }).httpClient
				.request
		).mockResolvedValue(mockResponse)

		const spy = vi.spyOn(cache, 'set')

		await provider.reverseGeocode(1.23456789, -2.3456789)

		expect(spy).toHaveBeenCalledWith(
			expect.stringMatching(/reverse:1\.23457,-2\.34568:/),
			expect.anything(),
			expect.anything()
		)
	})
})
