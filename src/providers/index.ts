/**
 * Provider factory: create a map provider by ID with the given config.
 */

import type { MapProvider } from '../core/provider.interface'
import { GoogleProvider } from './google/google-provider'
import type { GoogleProviderConfig } from './google/google-provider'
import { MapboxProvider } from './mapbox/mapbox-provider'
import type { MapboxProviderConfig } from './mapbox/mapbox-provider'

export type ProviderConfig =
	| ({ provider: 'google' } & GoogleProviderConfig)
	| ({ provider: 'mapbox' } & MapboxProviderConfig)

/**
 * Create a map provider instance by provider ID and config.
 * @param config - Provider identifier and provider-specific options.
 * @returns MapProvider implementation.
 */
export function createProvider(config: ProviderConfig): MapProvider {
	if (config.provider === 'google') {
		return new GoogleProvider({
			apiKey: config.apiKey,
			baseUrl: config.baseUrl,
		})
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
