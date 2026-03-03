/**
 * Provider factory: create a map provider by ID with the given config.
 */

import type { Cache } from '../core/cache.interface'
import type { MapProvider } from '../core/provider.interface'
import { NoopCache } from '../cache/noop.cache'
import { GoogleMapsProvider } from './google'
import type { GoogleProviderConfig } from './google/config'
import { MapboxProvider } from './mapbox/mapbox-provider'
import type { MapboxProviderConfig } from './mapbox/mapbox-provider'
import { OpenStreetMapProvider } from './openstreetmap/openstreetmap-provider'
import type { OpenStreetMapProviderConfig } from './openstreetmap/openstreetmap-provider'

/** Optional HTTP config for createProvider (google). */
interface CreateProviderGoogleOptions {
	httpConfig?: { timeout?: number; retries?: number; baseUrl?: string }
}

/**
 * Configuration for createMapClient.
 * @deprecated Prefer createProvider for the long-term, provider-agnostic API.
 */
export interface MapClientConfig {
	/** Provider identifier: 'google', 'mapbox', or 'openstreetmap'. */
	provider: 'google' | 'mapbox' | 'openstreetmap'
	/** API key / access token (required for google/mapbox; for openstreetmap used as User-Agent if userAgent not set). */
	apiKey: string
	/** Optional for openstreetmap: User-Agent string (Nominatim usage policy). Defaults to apiKey when not set. */
	userAgent?: string
	/** Optional base URL (e.g. for testing or enterprise proxies). */
	baseUrl?: string
	/** Optional cache instance (Mapbox/OpenStreetMap use this for geocode/reverse). */
	cache?: Cache
	/** Optional HTTP client configuration (timeout, retries). */
	httpConfig?: { timeout?: number; retries?: number }
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
	switch (config.provider) {
		case 'google':
			if (!config.apiKey)
				throw new Error('apiKey is required for Google provider')
			return new GoogleMapsProvider(config.apiKey, {
				...config.httpConfig,
				baseUrl: config.baseUrl,
			})
		case 'mapbox':
			if (!config.apiKey)
				throw new Error('apiKey is required for Mapbox provider')
			return new MapboxProvider({
				accessToken: config.apiKey,
				baseUrl: config.baseUrl,
				cache,
				httpConfig: config.httpConfig,
			})
		case 'openstreetmap':
			return new OpenStreetMapProvider({
				userAgent: config.userAgent ?? config.apiKey,
				baseUrl: config.baseUrl,
				cache,
				httpConfig: config.httpConfig,
			})
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
	| ({ provider: 'openstreetmap' } & OpenStreetMapProviderConfig)

/**
 * Create a map provider instance by provider ID and config.
 * This is the long-term, provider-agnostic entry point: one factory, multiple
 * backends (google, mapbox, etc.). For 'google', returns the full
 * GoogleMapsProvider (geocoding with cache/HTTP). For 'mapbox', returns
 * MapboxProvider (geocoding, reverse geocoding, autocomplete). For
 * 'openstreetmap', returns OpenStreetMapProvider (Nominatim).
 *
 * @param config - Provider identifier and provider-specific options.
 * @returns MapProvider implementation.
 */
export function createProvider(config: ProviderConfig): MapProvider {
	if (config.provider === 'google') {
		return new GoogleMapsProvider(config.apiKey, {
			...config.httpConfig,
			baseUrl: config.baseUrl,
		})
	}
	if (config.provider === 'mapbox') {
		return new MapboxProvider({
			accessToken: config.accessToken,
			baseUrl: config.baseUrl,
			cache: config.cache,
			httpConfig: config.httpConfig,
		})
	}
	if (config.provider === 'openstreetmap') {
		return new OpenStreetMapProvider({
			userAgent: config.userAgent,
			email: config.email,
			baseUrl: config.baseUrl,
			cache: config.cache,
			httpConfig: config.httpConfig,
		})
	}
	throw new Error(
		`Unknown provider: ${(config as { provider: string }).provider}`
	)
}

export { MapboxProvider } from './mapbox/mapbox-provider'
export { OpenStreetMapProvider } from './openstreetmap/openstreetmap-provider'
