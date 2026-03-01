import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoogleMapsProvider } from '@/providers/google'
import { MemoryCache } from '@/cache/memory.cache'
import type { HttpClient } from '@/http/http-client'

describe('GoogleMapsProvider - autocomplete', () => {
	let provider: GoogleMapsProvider
	let httpClient: HttpClient

	beforeEach(() => {
		const cache = new MemoryCache()
		provider = new GoogleMapsProvider('fake-api-key', cache, {
			timeout: 5000,
		})
		httpClient = (provider as { httpClient: HttpClient }).httpClient
		vi.spyOn(httpClient, 'request')
	})

	it('should return predictions for a valid input', async () => {
		const mockResponse = {
			status: 'OK',
			predictions: [
				{
					description:
						'Av. Paulista, 1000 - São Paulo, SP, Brazil',
					place_id: 'ChIJN1t_tDeuEmsRUrucRrwoX7k',
					matched_substrings: [{ length: 11, offset: 0 }],
					structured_formatting: {
						main_text: 'Av. Paulista, 1000',
						main_text_matched_substrings: [
							{ length: 11, offset: 0 },
						],
						secondary_text: 'São Paulo, SP, Brazil',
					},
				},
				{
					description:
						'Av. Paulista, 1578 - São Paulo, SP, Brazil',
					place_id: 'ChIJp0NfXDeuEmsR4kS8z5x6y7',
					matched_substrings: [{ length: 11, offset: 0 }],
					structured_formatting: {
						main_text: 'Av. Paulista, 1578',
						main_text_matched_substrings: [
							{ length: 11, offset: 0 },
						],
						secondary_text: 'São Paulo, SP, Brazil',
					},
				},
			],
		}

		vi.mocked(httpClient.request).mockResolvedValue(mockResponse)

		const predictions = await provider.autocomplete('Av. Paulista')

		expect(predictions).toHaveLength(2)
		expect(predictions[0]).toEqual({
			description: 'Av. Paulista, 1000 - São Paulo, SP, Brazil',
			placeId: 'ChIJN1t_tDeuEmsRUrucRrwoX7k',
			matchedSubstrings: [{ length: 11, offset: 0 }],
			structuredFormatting: {
				mainText: 'Av. Paulista, 1000',
				mainTextMatchedSubstrings: [{ length: 11, offset: 0 }],
				secondaryText: 'São Paulo, SP, Brazil',
			},
		})

		expect(httpClient.request).toHaveBeenCalledWith({
			url: '/place/autocomplete/json',
			method: 'GET',
			params: expect.objectContaining({
				input: 'Av. Paulista',
				key: 'fake-api-key',
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

	it('should return empty array when no predictions found', async () => {
		const mockResponse = {
			status: 'ZERO_RESULTS',
			predictions: [],
		}
		vi.mocked(httpClient.request).mockResolvedValue(mockResponse)

		const predictions = await provider.autocomplete('asdfghjkl')
		expect(predictions).toEqual([])
	})

	it('should handle API errors gracefully and return empty array', async () => {
		const mockResponse = {
			status: 'REQUEST_DENIED',
			error_message: 'API key invalid',
			predictions: [],
		}
		vi.mocked(httpClient.request).mockResolvedValue(mockResponse)

		const predictions = await provider.autocomplete('test')
		expect(predictions).toEqual([])
	})

	it('should handle network errors and return empty array', async () => {
		vi.mocked(httpClient.request).mockRejectedValue(
			new Error('Network error')
		)

		const predictions = await provider.autocomplete('test')
		expect(predictions).toEqual([])
	})

	it('should pass language option correctly', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			status: 'ZERO_RESULTS',
			predictions: [],
		})

		await provider.autocomplete('Av. Paulista', { language: 'pt-BR' })
		expect(httpClient.request).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({ language: 'pt-BR' }),
			})
		)
	})

	it('should pass sessionToken option correctly', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			status: 'ZERO_RESULTS',
			predictions: [],
		})

		const sessionToken = 'abc123'
		await provider.autocomplete('Av. Paulista', { sessionToken })
		expect(httpClient.request).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({
					sessiontoken: sessionToken,
				}),
			})
		)
	})

	it('should pass types option correctly', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			status: 'ZERO_RESULTS',
			predictions: [],
		})

		await provider.autocomplete('Av. Paulista', { types: 'address' })
		expect(httpClient.request).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({ types: 'address' }),
			})
		)
	})

	it('should pass location and radius correctly', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			status: 'ZERO_RESULTS',
			predictions: [],
		})

		await provider.autocomplete('Av. Paulista', {
			location: { lat: -23.55, lng: -46.63 },
			radius: 5000,
		})
		expect(httpClient.request).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({
					location: '-23.55,-46.63',
					radius: '5000',
				}),
			})
		)
	})

	it('should pass country components correctly (single country)', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			status: 'ZERO_RESULTS',
			predictions: [],
		})

		await provider.autocomplete('Av. Paulista', {
			components: { country: 'br' },
		})
		expect(httpClient.request).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({
					components: 'country:br',
				}),
			})
		)
	})

	it('should pass country components correctly (multiple countries)', async () => {
		vi.mocked(httpClient.request).mockResolvedValue({
			status: 'ZERO_RESULTS',
			predictions: [],
		})

		await provider.autocomplete('Av. Paulista', {
			components: { country: ['br', 'pt'] },
		})
		expect(httpClient.request).toHaveBeenCalledWith(
			expect.objectContaining({
				params: expect.objectContaining({
					components: 'country:br|pt',
				}),
			})
		)
	})
})
