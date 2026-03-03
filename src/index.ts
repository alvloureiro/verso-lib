/**
 * verso-lib: TypeScript library abstracting map APIs (Google Maps, Mapbox).
 * Provides geocoding, distance matrix, and routing for web and mobile consumers.
 */

// Core types and interfaces
export type {
	LatLng,
	Bounds,
	Address,
	GeocodeResult,
	ReverseGeocodeResult,
	DistanceMatrixEntry,
	DistanceMatrixResponse,
	RouteStep,
	RouteResult,
	PlacePrediction,
} from './core/types'
export type { Cache } from './core/cache.interface'
export type {
	MapProvider,
	GeocodeOptions,
	ReverseGeocodeOptions,
	DistanceMatrixOptions,
	RouteOptions,
	AutocompleteOptions,
} from './core/provider.interface'

// Provider factory and implementations
export {
	createMapClient,
	createProvider,
	MapboxProvider,
	OpenStreetMapProvider,
} from './providers'
export type { MapClientConfig, ProviderConfig } from './providers'
export type { GoogleProviderConfig } from './providers/google/config'
export type { MapboxProviderConfig } from './providers/mapbox/mapbox-provider'
export type { OpenStreetMapProviderConfig } from './providers/openstreetmap/openstreetmap-provider'

// Services
export { GeocodingService, DistanceService, RouteService } from './services'
export type {
	GeocodingServiceOptions,
	DistanceServiceOptions,
	RouteServiceOptions,
} from './services'

// Cache implementations
export { NoopCache } from './cache/noop.cache'
export { MemoryCache, type MemoryCacheOptions } from './cache/memory.cache'
export { RedisCache } from './cache/redis.cache'
export type { RedisLikeClient } from './cache/redis.cache'

// HTTP client
export { HttpClient } from './http/http-client'
export type {
	RequestOptions,
	HttpClientConfig,
	HttpResponse,
	HttpError,
} from './http/http-client'

// Utils
export { haversineDistanceMeters } from './utils/geo.utils'
