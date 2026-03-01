import { describe, it, expect } from 'vitest'
import { NoopCache } from '@/cache/noop.cache'

describe('NoopCache', () => {
	it('get returns undefined', async () => {
		const cache = new NoopCache()
		expect(await cache.get('any')).toBeUndefined()
	})

	it('set and del do not throw', async () => {
		const cache = new NoopCache()
		await expect(cache.set('k', 'v')).resolves.toBeUndefined()
		await expect(cache.del('k')).resolves.toBeUndefined()
	})
})
