import { describe, it, expect } from 'vitest'
import { haversineDistanceMeters } from '@/utils/geo.utils'

describe('haversineDistanceMeters', () => {
	it('returns 0 for same point', () => {
		const point = { lat: 40.7128, lng: -74.006 }
		expect(haversineDistanceMeters(point, point)).toBe(0)
	})

	it('returns positive distance for two different points', () => {
		const a = { lat: 40.7128, lng: -74.006 }
		const b = { lat: 40.7589, lng: -73.9851 }
		const distance = haversineDistanceMeters(a, b)
		expect(distance).toBeGreaterThan(0)
		expect(distance).toBeLessThan(100_000)
	})
})
