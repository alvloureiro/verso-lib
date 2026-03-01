/**
 * Provider factory: create a map provider by ID with the given config.
 */

import type { Cache } from '../core/cache.interface'
import type { MapProvider } from '../core/provider.interface'
import { NoopCache } from '../cache/noop.cache'
import { GoogleMapsProvider } from './google'
import type { GoogleProviderConfig } from './google/google-provider'
import { MapboxProvider } from './mapbox/mapbox-provider'
import type { MapboxProviderConfig } from './mapbox/mapbox-provider'

/** Optional cache and HTTP config for createProvider (google). */
interface CreateProviderGoogleOptions {
	cache?: Cache
	httpConfig?: { timeout?: number; retries?: number }
}

/**
 * Configuration for createMapClient.
 * @deprecated Prefer createProvider for the long-term, provider-agnostic API.
 */
export interface MapClientConfig {
	/** Provider identifier – initially only 'google'. */
	provider: 'google'
	/** API key for the chosen provider. */
	apiKey: string
	/** Optional cache implementation. If not provided, a no-op cache is used. */
	cache?: Cache
	/** Optional HTTP client configuration (timeout, retries). */
	httpConfig?: {
		timeout?: number
		retries?: number
	}
}

/**
 * Creates a map client instance based on the provided configuration.
 * Convenience alias for Google-only usage; for new code prefer createProvider.
 *
 * @param config - Client configuration
 * @returns An object implementing the MapProvider interface
 * @deprecated Prefer createProvider for the long-term API.
 */
export function createMapClient(config: MapClientConfig): MapProvider {
	const cache = config.cache ?? new NoopCache()
	const httpConfig = config.httpConfig

	switch (config.provider) {
		case 'google':
			return new GoogleMapsProvider(config.apiKey, cache, httpConfig)
		default: {
			const p = (config as { provider: string }).provider
			throw new Error(`Unsupported provider: ${p}`)
		}
	}
}

export type ProviderConfig =
	| ({ provider: 'google' } & GoogleProviderConfig &
			CreateProviderGoogleOptions)
	| ({ provider: 'mapbox' } & MapboxProviderConfig)

/**
 * Create a map provider instance by provider ID and config.
 * This is the long-term, provider-agnostic entry point: one factory, multiple
 * backends (google, mapbox, etc.). For 'google', returns the full
 * GoogleMapsProvider (geocoding with cache/HTTP). For 'mapbox', returns a stub
 * until that provider is implemented.
 *
 * @param config - Provider identifier and provider-specific options.
 * @returns MapProvider implementation.
 */
export function createProvider(config: ProviderConfig): MapProvider {
	if (config.provider === 'google') {
		const cache = config.cache ?? new NoopCache()
		return new GoogleMapsProvider(config.apiKey, cache, config.httpConfig)
	}
	if (config.provider === 'mapbox') {
		return new MapboxProvider({
			accessToken: config.accessToken,
			baseUrl: config.baseUrl,
		})
	}
	throw new Error(
		`Unknown provider: ${(config as { provider: string }).provider}`
	)
}

export { GoogleProvider } from './google/google-provider'
export { MapboxProvider } from './mapbox/mapbox-provider'
