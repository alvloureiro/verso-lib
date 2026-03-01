/**
 * Helpers for HTTP client: retry decisions, backoff, and logging.
 */

import type { HttpClientConfig } from './types'

const LOG_PREFIX = '[HttpClient]'

/** Query param names that must be redacted from logs (case-insensitive). */
const SENSITIVE_PARAM_NAMES = new Set([
	'key',
	'api_key',
	'apikey',
	'access_token',
	'accesstoken',
	'token',
])

/**
 * Redact sensitive query parameters (e.g. API keys, tokens) from a URL.
 * Used when logging request URLs so secrets are never written to logs.
 * @param url - Full or relative URL
 * @returns URL with sensitive param values replaced by '***'
 */
export function redactSensitiveParamsFromUrl(url: string): string {
	try {
		const parsed = url.startsWith('http')
			? new URL(url)
			: new URL(url, 'http://invalid.local')
		for (const [name] of parsed.searchParams) {
			if (SENSITIVE_PARAM_NAMES.has(name.toLowerCase())) {
				parsed.searchParams.set(name, '***')
			}
		}
		const redacted = parsed.toString()
		return url.startsWith('http') ? redacted : parsed.pathname + parsed.search
	} catch {
		return url
	}
}

/**
 * Sleep for a given number of milliseconds (for retry delays).
 * @param ms - Delay in milliseconds.
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Compute delay for retry attempt with optional jitter.
 * @param attempt - Zero-based attempt number.
 * @param baseDelayMs - Base delay in ms.
 * @param backoff - 'linear' or 'exponential'.
 * @param jitter - Add random jitter (0-20% of delay).
 */
export function getRetryDelayMs(
	attempt: number,
	baseDelayMs: number,
	backoff: 'linear' | 'exponential',
	jitter = true
): number {
	const multiplier =
		backoff === 'exponential' ? Math.pow(2, attempt) : attempt + 1
	let delay = baseDelayMs * multiplier
	if (jitter) {
		const jitterRange = delay * 0.2
		delay += Math.random() * jitterRange - jitterRange / 2
		delay = Math.max(0, delay)
	}
	return Math.round(delay)
}

/**
 * Whether the request method is allowed to be retried (idempotent by default).
 */
export function isRetryableMethod(
	method: string,
	allowedMethods: string[]
): boolean {
	return allowedMethods.includes(method.toUpperCase())
}

/**
 * Whether the response status should trigger a retry.
 */
export function isRetryableStatus(
	status: number,
	retryStatusCodes: number[]
): boolean {
	return retryStatusCodes.includes(status)
}

/**
 * Log request (method, url, headers, body) when logLevel is debug.
 */
export function logRequest(
	logLevel: HttpClientConfig['logLevel'],
	opts: {
		method: string
		url: string
		headers: HeadersInit
		body?: BodyInit | null
	}
): void {
	if (logLevel !== 'debug') return
	const { method, url, headers, body } = opts
	const safeUrl = redactSensitiveParamsFromUrl(url)
	const headerObj =
		headers instanceof Headers
			? Object.fromEntries(headers.entries())
			: Array.isArray(headers)
				? Object.fromEntries(headers)
				: (headers as Record<string, string>)
	console.debug(`${LOG_PREFIX} Request`, {
		method,
		url: safeUrl,
		headers: headerObj,
		...(body != null && { body: String(body).slice(0, 200) }),
	})
}

/**
 * Log response (status, duration, data truncated) when logLevel is debug.
 */
export function logResponse(
	logLevel: HttpClientConfig['logLevel'],
	opts: {
		status: number
		statusText: string
		durationMs: number
		dataPreview?: string
	}
): void {
	if (logLevel !== 'debug') return
	console.debug(`${LOG_PREFIX} Response`, {
		status: opts.status,
		statusText: opts.statusText,
		durationMs: opts.durationMs,
		...(opts.dataPreview != null && { dataPreview: opts.dataPreview }),
	})
}

/**
 * Log retry attempt (attempt number, delay, reason).
 */
export function logRetry(
	logLevel: HttpClientConfig['logLevel'],
	opts: { attempt: number; delayMs: number; reason: string }
): void {
	if (logLevel !== 'debug' && logLevel !== 'info') return
	const msg = `${LOG_PREFIX} Retry #${opts.attempt} in ${opts.delayMs}ms: ${opts.reason}`
	if (logLevel === 'debug') console.debug(msg)
	else console.info(msg)
}

/**
 * Log error (message, status, request).
 */
export function logError(
	logLevel: HttpClientConfig['logLevel'],
	opts: { message: string; status?: number; url?: string }
): void {
	if (logLevel === 'none') return
	const safeUrl =
		opts.url != null ? redactSensitiveParamsFromUrl(opts.url) : undefined
	console.error(`${LOG_PREFIX} ${opts.message}`, {
		...(opts.status != null && { status: opts.status }),
		...(safeUrl != null && { url: safeUrl }),
	})
}
