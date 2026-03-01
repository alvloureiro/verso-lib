/**
 * Integration test: full geocode path with real HTTP client and mock server.
 * Uses msw to intercept requests to Google Geocoding API; no httpClient.request mock.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { createProvider } from '@/providers'

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json'

const mockGoogleResponse = {
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
				{ long_name: '1000', short_name: '1000', types: ['street_number'] },
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

const server = setupServer(
	http.get(GOOGLE_GEOCODE_URL, () => HttpResponse.json(mockGoogleResponse))
)

describe('geocode integration (msw)', () => {
	beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
	afterAll(() => server.close())

	it('full path: createProvider -> geocode() -> parsed result via mock HTTP', async () => {
		const provider = createProvider({
			provider: 'google',
			apiKey: 'test-key',
		})
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
	})
})
