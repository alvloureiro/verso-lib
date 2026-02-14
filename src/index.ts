/**
 * verso-lib: TypeScript library abstracting map APIs (Google Maps, Mapbox).
 * Provides geocoding, distance matrix, and routing for web and mobile consumers.
 */

// Core types and interfaces
export type {
	ProviderId,
	LatLng,
	GeocodingResult,
	DistanceMatrixElement,
	DistanceMatrixResult,
	RouteStep,
	RouteResult,
} from './core/types'
export type { CacheInterface } from './core/cache.interface'
export type { MapProvider } from './core/provider.interface'

// Provider factory and implementations
export { createProvider, GoogleProvider, MapboxProvider } from './providers'
export type { ProviderConfig } from './providers'
export type { GoogleProviderConfig } from './providers/google/google-provider'
export type { MapboxProviderConfig } from './providers/mapbox/mapbox-provider'

// Services
export { GeocodingService, DistanceService, RouteService } from './services'
export type {
	GeocodingServiceOptions,
	DistanceServiceOptions,
	RouteServiceOptions,
} from './services'

// Cache implementations
export { NoopCache } from './cache/noop.cache'
export { MemoryCache } from './cache/memory.cache'
export { RedisCache } from './cache/redis.cache'
export type { RedisLikeClient } from './cache/redis.cache'

// HTTP client
export { HttpClient } from './http/http-client'
export type { HttpClientOptions } from './http/http-client'
export type {
	RequestContext,
	ResponseContext,
	RequestInterceptor,
	ResponseInterceptor,
} from './http/interceptors'
export {
	createRetryInterceptor,
	createLoggingInterceptor,
} from './http/interceptors'

// Utils
export { haversineDistanceMeters } from './utils/geo.utils'
