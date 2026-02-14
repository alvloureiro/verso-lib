import { describe, it, expect } from 'vitest'
import { createProvider } from '../../src/providers'

describe('createProvider', () => {
	it('creates Google provider with apiKey', () => {
		const provider = createProvider({
			provider: 'google',
			apiKey: 'test-key',
		})
		expect(provider).toBeDefined()
		expect(provider.geocode).toBeDefined()
		expect(provider.getDistanceMatrix).toBeDefined()
		expect(provider.getRoute).toBeDefined()
	})

	it('creates Mapbox provider with accessToken', () => {
		const provider = createProvider({
			provider: 'mapbox',
			accessToken: 'test-token',
		})
		expect(provider).toBeDefined()
		expect(provider.geocode).toBeDefined()
	})

	it('throws for unknown provider', () => {
		expect(() =>
			createProvider({ provider: 'unknown' as 'google', apiKey: 'x' })
		).toThrow(/Unknown provider/)
	})
})
