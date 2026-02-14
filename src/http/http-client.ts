/**
 * Generic isomorphic HTTP client (fetch-based).
 */

export interface HttpClientOptions {
	baseUrl?: string
	headers?: Record<string, string>
	timeoutMs?: number
}

/**
 * Minimal fetch-based HTTP client for map API requests.
 * Can be extended with interceptors for logging, retry, etc.
 */
export class HttpClient {
	private readonly baseUrl: string
	private readonly headers: Record<string, string>
	private readonly timeoutMs: number

	constructor(options: HttpClientOptions = {}) {
		this.baseUrl = options.baseUrl ?? ''
		this.headers = options.headers ?? {}
		this.timeoutMs = options.timeoutMs ?? 10_000
	}

	/**
	 * Perform a GET request.
	 * @param path - Path or full URL (if baseUrl is set, path is appended).
	 * @param params - Optional query parameters.
	 * @returns Parsed JSON response.
	 */
	async get<T>(path: string, params?: Record<string, string>): Promise<T> {
		const url = this.buildUrl(path, params)
		const res = await this.fetchWithTimeout(url, { method: 'GET' })
		if (!res.ok) {
			throw new Error(`HTTP ${res.status}: ${res.statusText}`)
		}
		return (await res.json()) as T
	}

	private buildUrl(path: string, params?: Record<string, string>): string {
		const base = path.startsWith('http') ? path : `${this.baseUrl}${path}`
		if (!params || Object.keys(params).length === 0) return base
		const search = new URLSearchParams(params).toString()
		return `${base}${base.includes('?') ? '&' : '?'}${search}`
	}

	private async fetchWithTimeout(
		url: string,
		init: RequestInit
	): Promise<Response> {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs)
		try {
			const res = await fetch(url, {
				...init,
				headers: {
					...this.headers,
					...(init.headers as Record<string, string>),
				},
				signal: controller.signal,
			})
			return res
		} finally {
			clearTimeout(timeoutId)
		}
	}
}
