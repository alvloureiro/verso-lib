/**
 * Types for the HTTP client (request options, config, errors).
 */

/**
 * Options for a single HTTP request. Extends RequestInit with url and params.
 */
export interface RequestOptions extends Omit<RequestInit, 'signal'> {
	/** Request URL (path or full URL; baseURL is prepended if set). */
	url: string
	/** Optional query parameters (merged into url). */
	params?: Record<string, string>
	/** Override global retry setting for this request. */
	retry?: boolean
}

/**
 * Configuration for the HttpClient constructor.
 */
export interface HttpClientConfig {
	/** Base URL prepended to request URLs. */
	baseURL?: string
	/** Default headers sent with every request. */
	headers?: Record<string, string>
	/** Maximum number of retry attempts (default 3). */
	maxRetries?: number
	/** Base delay in ms before first retry (default 1000). */
	retryDelay?: number
	/** Backoff strategy: linear or exponential. */
	retryBackoff?: 'linear' | 'exponential'
	/** HTTP status codes that trigger a retry (default 408, 429, 5xx). */
	retryStatusCodes?: number[]
	/** HTTP methods that are allowed to be retried (idempotent by default). */
	retryMethods?: string[]
	/** Logging level: none, info, or debug. */
	logLevel?: 'none' | 'debug' | 'info'
	/** Request timeout in ms (default 30000). */
	timeout?: number
}

/**
 * Normalized response shape after parsing (for typing).
 */
export interface HttpResponse<T = unknown> {
	/** Response body (parsed). */
	data: T
	/** HTTP status code. */
	status: number
	/** HTTP status text. */
	statusText: string
	/** Response headers. */
	headers: Headers
}

/**
 * Error thrown by HttpClient with status and request context.
 */
export class HttpError extends Error {
	/** HTTP status code (if response was received). */
	readonly status: number
	/** HTTP status text. */
	readonly statusText: string
	/** Parsed error response body (if any). */
	readonly data: unknown
	/** Request options that caused the error (for debugging). */
	readonly request: RequestOptions

	constructor(
		message: string,
		opts: {
			status: number
			statusText: string
			data: unknown
			request: RequestOptions
		}
	) {
		super(message)
		this.name = 'HttpError'
		this.status = opts.status
		this.statusText = opts.statusText
		this.data = opts.data
		this.request = opts.request
		Object.setPrototypeOf(this, HttpError.prototype)
	}
}
