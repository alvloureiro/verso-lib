/**
 * Interceptors for HTTP client (logging, retry, etc.).
 * Can be applied when extending the HTTP client.
 */

export interface RequestContext {
	url: string
	method: string
	headers?: Record<string, string>
}

export interface ResponseContext {
	status: number
	statusText: string
	ok: boolean
}

/**
 * Request interceptor type. Can modify the request or throw to abort.
 */
export type RequestInterceptor = (
	ctx: RequestContext
) => RequestContext | Promise<RequestContext>

/**
 * Response interceptor type. Can modify response, retry, or throw.
 */
export type ResponseInterceptor = (
	req: RequestContext,
	res: ResponseContext
) => ResponseContext | Promise<ResponseContext>

/**
 * Build a simple retry policy: retry on 5xx or network errors.
 * @param maxRetries - Maximum number of retries.
 * @param delayMs - Delay between retries in milliseconds.
 */
export function createRetryInterceptor(
	maxRetries: number,
	delayMs: number
): ResponseInterceptor {
	return async (req, res) => {
		let lastRes = res
		for (let attempt = 0; attempt < maxRetries; attempt++) {
			if (lastRes.ok || (lastRes.status >= 400 && lastRes.status < 500)) {
				return lastRes
			}
			await new Promise((r) => setTimeout(r, delayMs))
			// Caller would re-execute request; here we only return context.
			lastRes = { ...lastRes }
		}
		return lastRes
	}
}

/**
 * No-op request interceptor for logging placeholder.
 * Replace with actual logger in integration.
 */
export function createLoggingInterceptor(
	log: (msg: string, meta?: Record<string, unknown>) => void
): RequestInterceptor {
	return (ctx) => {
		log('HTTP request', { url: ctx.url, method: ctx.method })
		return ctx
	}
}
