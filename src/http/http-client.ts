/**
 * Isomorphic HTTP client with retry, timeout, and optional logging.
 */

import type { RequestOptions, HttpClientConfig } from './types'
import { HttpError } from './types'
import {
	sleep,
	getRetryDelayMs,
	isRetryableMethod,
	isRetryableStatus,
	logRequest,
	logResponse,
	logRetry,
	logError,
} from './interceptors'

const DEFAULT_RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]
const DEFAULT_RETRY_METHODS = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']
const MAX_DATA_PREVIEW_LEN = 200

export type {
	RequestOptions,
	HttpClientConfig,
	HttpResponse,
	HttpError,
} from './types'

/**
 * HTTP client that works in browsers, React Native, and Node.js 18+.
 * Supports retry with exponential backoff, timeout, and optional debug logging.
 */
export class HttpClient {
	private readonly baseURL: string
	private readonly defaultHeaders: Record<string, string>
	private readonly config: Required<HttpClientConfig>

	constructor(config: HttpClientConfig = {}) {
		this.baseURL = config.baseURL ?? ''
		this.defaultHeaders = config.headers ?? {}
		this.config = {
			baseURL: this.baseURL,
			headers: this.defaultHeaders,
			maxRetries: config.maxRetries ?? 3,
			retryDelay: config.retryDelay ?? 1000,
			retryBackoff: config.retryBackoff ?? 'exponential',
			retryStatusCodes: config.retryStatusCodes ?? DEFAULT_RETRY_STATUS_CODES,
			retryMethods: config.retryMethods ?? DEFAULT_RETRY_METHODS,
			logLevel: config.logLevel ?? 'none',
			timeout: config.timeout ?? 30000,
		}
	}

	/**
	 * Perform an HTTP request with retry logic.
	 * Merges default headers, applies timeout, retries on transient failures,
	 * parses JSON and throws HttpError on non-OK status.
	 *
	 * @param options - Request options (method, url, body, headers, params, retry).
	 * @returns Promise with the parsed response data.
	 */
	async request<T = unknown>(options: RequestOptions): Promise<T> {
		const url = this.buildUrl(options.url, options.params)
		const headers = this.mergeHeaders(options.headers)
		const method = (options.method ?? 'GET').toUpperCase()
		const retryEnabled = options.retry ?? true
		const start = Date.now()

		logRequest(this.config.logLevel, {
			method,
			url,
			headers,
			body: options.body,
		})

		let lastError: Error | null = null
		let lastResponse: Response | null = null
		const maxAttempts = this.config.maxRetries + 1

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			const controller = new AbortController()
			const timeoutId = setTimeout(
				() => controller.abort(),
				this.config.timeout
			)

			try {
				const res = await fetch(url, {
					method: options.method,
					headers,
					body: options.body,
					mode: options.mode,
					credentials: options.credentials,
					cache: options.cache,
					redirect: options.redirect,
					referrer: options.referrer,
					referrerPolicy: options.referrerPolicy,
					integrity: options.integrity,
					keepalive: options.keepalive,
					signal: controller.signal,
				})
				clearTimeout(timeoutId)

				const durationMs = Date.now() - start

				if (!res.ok) {
					const canRetry =
						retryEnabled &&
						attempt < maxAttempts - 1 &&
						isRetryableMethod(method, this.config.retryMethods) &&
						isRetryableStatus(res.status, this.config.retryStatusCodes)

					if (canRetry) {
						const delayMs = getRetryDelayMs(
							attempt,
							this.config.retryDelay,
							this.config.retryBackoff
						)
						logRetry(this.config.logLevel, {
							attempt: attempt + 1,
							delayMs,
							reason: `status ${res.status} ${res.statusText}`,
						})
						await sleep(delayMs)
						lastResponse = res
						continue
					}

					const text = await res.text()
					let data: unknown
					try {
						data = text ? JSON.parse(text) : null
					} catch {
						data = text
					}
					const err = new HttpError(`HTTP ${res.status}: ${res.statusText}`, {
						status: res.status,
						statusText: res.statusText,
						data,
						request: options,
					})
					logError(this.config.logLevel, {
						message: err.message,
						status: res.status,
						url,
					})
					logResponse(this.config.logLevel, {
						status: res.status,
						statusText: res.statusText,
						durationMs,
						dataPreview: truncate(String(data), MAX_DATA_PREVIEW_LEN),
					})
					throw err
				}

				const text = await res.text()
				let data: T
				try {
					data = (text ? JSON.parse(text) : null) as T
				} catch {
					data = text as T
				}

				logResponse(this.config.logLevel, {
					status: res.status,
					statusText: res.statusText,
					durationMs,
					dataPreview: truncate(JSON.stringify(data), MAX_DATA_PREVIEW_LEN),
				})

				return data
			} catch (err) {
				clearTimeout(timeoutId)
				lastError = err instanceof Error ? err : new Error(String(err))

				const isAbort = err instanceof Error && err.name === 'AbortError'
				const isNetwork = err instanceof TypeError || isAbort

				const canRetry =
					retryEnabled &&
					attempt < maxAttempts - 1 &&
					isRetryableMethod(method, this.config.retryMethods) &&
					(isNetwork || (lastResponse != null && lastResponse.ok === false))

				if (lastResponse != null && !lastResponse.ok && canRetry) {
					const delayMs = getRetryDelayMs(
						attempt,
						this.config.retryDelay,
						this.config.retryBackoff
					)
					logRetry(this.config.logLevel, {
						attempt: attempt + 1,
						delayMs,
						reason: lastResponse
							? `status ${lastResponse.status}`
							: isAbort
								? 'timeout'
								: 'network error',
					})
					await sleep(delayMs)
					continue
				}

				if (isNetwork && canRetry) {
					const delayMs = getRetryDelayMs(
						attempt,
						this.config.retryDelay,
						this.config.retryBackoff
					)
					logRetry(this.config.logLevel, {
						attempt: attempt + 1,
						delayMs,
						reason: isAbort ? 'timeout' : 'network error',
					})
					await sleep(delayMs)
					continue
				}

				if (isAbort) {
					const timeoutErr = new HttpError(
						`Request timeout after ${this.config.timeout}ms`,
						{
							status: 0,
							statusText: 'Timeout',
							data: null,
							request: options,
						}
					)
					logError(this.config.logLevel, {
						message: timeoutErr.message,
						url,
					})
					throw timeoutErr
				}

				throw err
			}
		}

		if (lastResponse != null && !lastResponse.ok) {
			const text = await lastResponse.text()
			let data: unknown
			try {
				data = text ? JSON.parse(text) : null
			} catch {
				data = text
			}
			throw new HttpError(
				`HTTP ${lastResponse.status}: ${lastResponse.statusText}`,
				{
					status: lastResponse.status,
					statusText: lastResponse.statusText,
					data,
					request: options,
				}
			)
		}

		throw lastError ?? new Error('Request failed')
	}

	private buildUrl(path: string, params?: Record<string, string>): string {
		const base = path.startsWith('http') ? path : `${this.baseURL}${path}`
		if (!params || Object.keys(params).length === 0) return base
		const search = new URLSearchParams(params).toString()
		return `${base}${base.includes('?') ? '&' : '?'}${search}`
	}

	private mergeHeaders(requestHeaders?: HeadersInit): Record<string, string> {
		const combined: Record<string, string> = { ...this.defaultHeaders }
		if (requestHeaders instanceof Headers) {
			requestHeaders.forEach((v, k) => {
				combined[k] = v
			})
		} else if (Array.isArray(requestHeaders)) {
			for (const [k, v] of requestHeaders) {
				combined[k] = v
			}
		} else if (requestHeaders != null) {
			Object.assign(combined, requestHeaders)
		}
		return combined
	}
}

function truncate(s: string, maxLen: number): string {
	if (s.length <= maxLen) return s
	return s.slice(0, maxLen) + '...'
}
