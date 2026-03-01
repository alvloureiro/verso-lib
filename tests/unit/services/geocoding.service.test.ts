import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeocodingService } from '@/services/geocoding.service'
import type { MapProvider } from '@/core/provider.interface'
import type { GeocodeResult } from '@/core/types'
import { MemoryCache } from '@/cache/memory.cache'

describe('GeocodingService', () => {
	let mockProvider: MapProvider
	let mockGeocode: ReturnType<typeof vi.fn>

	beforeEach(() => {
		mockGeocode = vi.fn()
		mockProvider = {
			geocode: mockGeocode,
			reverseGeocode: vi.fn(),
			getDistanceMatrix: vi.fn(),
			getRoute: vi.fn(),
		} as unknown as MapProvider
	})

	it('delegates to provider and returns results', async () => {
		const results: GeocodeResult[] = [
			{
				coordinates: { lat: 1, lng: 2 },
				address: { formattedAddress: 'Test' },
				placeId: 'p1',
			},
		]
		mockGeocode.mockResolvedValue(results)

		const service = new GeocodingService({ provider: mockProvider })
		const out = await service.geocode('Some Address')

		expect(mockGeocode).toHaveBeenCalledWith('Some Address', undefined)
		expect(out).toEqual(results)
	})

	it('returns empty array when provider returns empty', async () => {
		mockGeocode.mockResolvedValue([])

		const service = new GeocodingService({ provider: mockProvider })
		const out = await service.geocode('Unknown')

		expect(out).toEqual([])
	})

	it('uses cache when cache and cacheTtlSeconds are provided', async () => {
		const cache = new MemoryCache()
		const results: GeocodeResult[] = [
			{
				coordinates: { lat: 0, lng: 0 },
				address: { formattedAddress: 'Cached' },
				placeId: 'c1',
			},
		]
		mockGeocode.mockResolvedValue(results)

		const service = new GeocodingService({
			provider: mockProvider,
			cache,
			cacheTtlSeconds: 3600,
		})

		const first = await service.geocode('Same Address')
		expect(mockGeocode).toHaveBeenCalledTimes(1)

		const second = await service.geocode('Same Address')
		expect(mockGeocode).toHaveBeenCalledTimes(1)
		expect(second).toEqual(first)
	})

	it('does not use cache when cacheTtlSeconds is undefined', async () => {
		const cache = new MemoryCache()
		mockGeocode.mockResolvedValue([])

		const service = new GeocodingService({
			provider: mockProvider,
			cache,
		})

		await service.geocode('A')
		await service.geocode('A')
		expect(mockGeocode).toHaveBeenCalledTimes(2)
	})

	it('uses option-aware cache key (same address, different options = two provider calls)', async () => {
		const cache = new MemoryCache()
		mockGeocode.mockResolvedValue([{ coordinates: { lat: 0, lng: 0 }, address: { formattedAddress: 'X' }, placeId: 'p1' }])

		const service = new GeocodingService({
			provider: mockProvider,
			cache,
			cacheTtlSeconds: 3600,
		})

		await service.geocode('Rua X', { region: 'br' })
		await service.geocode('Rua X', { region: 'us' })
		expect(mockGeocode).toHaveBeenCalledTimes(2)
		expect(mockGeocode).toHaveBeenNthCalledWith(1, 'Rua X', { region: 'br' })
		expect(mockGeocode).toHaveBeenNthCalledWith(2, 'Rua X', { region: 'us' })
	})

	it('skips cache when options.skipCache is true', async () => {
		const cache = new MemoryCache()
		mockGeocode.mockResolvedValue([{ coordinates: { lat: 0, lng: 0 }, address: { formattedAddress: 'X' }, placeId: 'p1' }])

		const service = new GeocodingService({
			provider: mockProvider,
			cache,
			cacheTtlSeconds: 3600,
		})

		await service.geocode('Same', { skipCache: true })
		await service.geocode('Same', { skipCache: true })
		expect(mockGeocode).toHaveBeenCalledTimes(2)
	})
})
