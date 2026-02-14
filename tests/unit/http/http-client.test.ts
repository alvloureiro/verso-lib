import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpClient } from '../../../src/http/http-client'
import { HttpError } from '../../../src/http/types'

function mockResponse(
	status: number,
	statusText: string,
	body: string | object,
	headers?: Record<string, string>
): Response {
	const text = typeof body === 'string' ? body : JSON.stringify(body)
	return {
		ok: status >= 200 && status < 300,
		status,
		statusText,
		headers: new Headers(headers ?? {}),
		text: () => Promise.resolve(text),
		json: () => Promise.resolve(typeof body === 'string' ? JSON.parse(body) : body),
	} as unknown as Response
}

describe('HttpClient', () => {
	beforeEach(() => {
		vi.useRealTimers()
	})
	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('basic successful request', () => {
		it('returns parsed JSON when fetch returns 200', async () => {
			const data = { foo: 'bar' }
			vi.spyOn(global, 'fetch').mockResolvedValue(
				mockResponse(200, 'OK', data)
			)
			const client = new HttpClient()
			const result = await client.request({ url: 'https://api.example.com' })
			expect(result).toEqual(data)
			expect(fetch).toHaveBeenCalledTimes(1)
		})

		it('builds URL with query params', async () => {
			vi.spyOn(global, 'fetch').mockImplementation((url) => {
				expect(url).toBe('https://api.example.com/path?a=1&b=2')
				return Promise.resolve(
					mockResponse(200, 'OK', {})
				)
			})
			const client = new HttpClient({ baseURL: 'https://api.example.com' })
			await client.request({
				url: '/path',
				params: { a: '1', b: '2' },
			})
			expect(fetch).toHaveBeenCalledTimes(1)
		})

		it('merges default headers with request headers', async () => {
			vi.spyOn(global, 'fetch').mockImplementation((_url, init) => {
				const headers = init?.headers as Record<string, string>
				expect(headers?.['X-Default']).toBe('default')
				expect(headers?.['X-Request']).toBe('request')
				return Promise.resolve(mockResponse(200, 'OK', {}))
			})
			const client = new HttpClient({
				headers: { 'X-Default': 'default' },
			})
			await client.request({
				url: 'https://example.com',
				headers: { 'X-Request': 'request' },
			})
			expect(fetch).toHaveBeenCalledTimes(1)
		})

		it('returns text when response is not JSON', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValue(
				mockResponse(200, 'OK', 'plain text')
			)
			const client = new HttpClient()
			const result = await client.request({ url: 'https://example.com' })
			expect(result).toBe('plain text')
		})
	})

	describe('retry on network failure', () => {
		it('retries when fetch throws (network error)', async () => {
			const fetchSpy = vi
				.spyOn(global, 'fetch')
				.mockRejectedValueOnce(new TypeError('network error'))
				.mockResolvedValueOnce(mockResponse(200, 'OK', { ok: true }))
			const client = new HttpClient({ maxRetries: 2 })
			const result = await client.request({
				url: 'https://example.com',
			})
			expect(result).toEqual({ ok: true })
			expect(fetchSpy).toHaveBeenCalledTimes(2)
		})
	})

	describe('retry on status codes', () => {
		it('retries on 500 and then succeeds', async () => {
			const fetchSpy = vi
				.spyOn(global, 'fetch')
				.mockResolvedValueOnce(mockResponse(500, 'Internal Server Error', {}))
				.mockResolvedValueOnce(mockResponse(200, 'OK', { data: 1 }))
			const client = new HttpClient({ maxRetries: 2 })
			const result = await client.request({ url: 'https://example.com' })
			expect(result).toEqual({ data: 1 })
			expect(fetchSpy).toHaveBeenCalledTimes(2)
		})

		it('retries on 429', async () => {
			const fetchSpy = vi
				.spyOn(global, 'fetch')
				.mockResolvedValueOnce(mockResponse(429, 'Too Many Requests', {}))
				.mockResolvedValueOnce(mockResponse(200, 'OK', {}))
			const client = new HttpClient({ maxRetries: 2 })
			await client.request({ url: 'https://example.com' })
			expect(fetchSpy).toHaveBeenCalledTimes(2)
		})

		it('does not retry on 400', async () => {
			const fetchSpy = vi
				.spyOn(global, 'fetch')
				.mockResolvedValue(mockResponse(400, 'Bad Request', { err: 'bad' }))
			const client = new HttpClient({ maxRetries: 3 })
			await expect(
				client.request({ url: 'https://example.com' })
			).rejects.toThrow(HttpError)
			expect(fetchSpy).toHaveBeenCalledTimes(1)
		})

		it('does not retry when retry: false', async () => {
			const fetchSpy = vi
				.spyOn(global, 'fetch')
				.mockResolvedValue(mockResponse(503, 'Unavailable', {}))
			const client = new HttpClient({ maxRetries: 3 })
			await expect(
				client.request({ url: 'https://example.com', retry: false })
			).rejects.toThrow(HttpError)
			expect(fetchSpy).toHaveBeenCalledTimes(1)
		})

		it('throws after exhausting retries on 503', async () => {
			const fetchSpy = vi
				.spyOn(global, 'fetch')
				.mockResolvedValue(mockResponse(503, 'Unavailable', { err: 'busy' }))
			const client = new HttpClient({ maxRetries: 2 })
			await expect(
				client.request({ url: 'https://example.com' })
			).rejects.toThrow(HttpError)
			expect(fetchSpy).toHaveBeenCalledTimes(3)
		})
	})

	describe('exponential backoff', () => {
		it('waits with increasing delay between retries', async () => {
			vi.useFakeTimers()
			const fetchSpy = vi
				.spyOn(global, 'fetch')
				.mockResolvedValueOnce(mockResponse(503, 'Unavailable', {}))
				.mockResolvedValueOnce(mockResponse(503, 'Unavailable', {}))
				.mockResolvedValueOnce(mockResponse(200, 'OK', {}))
			const client = new HttpClient({
				maxRetries: 3,
				retryDelay: 1000,
				retryBackoff: 'exponential',
			})
			const promise = client.request({ url: 'https://example.com' })
			await vi.advanceTimersByTimeAsync(0)
			expect(fetchSpy).toHaveBeenCalledTimes(1)
			await vi.advanceTimersByTimeAsync(2000)
			expect(fetchSpy).toHaveBeenCalledTimes(2)
			await vi.advanceTimersByTimeAsync(4000)
			expect(fetchSpy).toHaveBeenCalledTimes(3)
			await vi.advanceTimersByTimeAsync(0)
			await promise
		})
	})

	describe('timeout', () => {
		it('throws HttpError with timeout message when fetch rejects with AbortError', async () => {
			vi.spyOn(global, 'fetch').mockRejectedValue(
				new DOMException('The operation was aborted', 'AbortError')
			)
			const client = new HttpClient({ timeout: 5000, maxRetries: 0 })
			const promise = client.request({ url: 'https://example.com' })
			await expect(promise).rejects.toThrow(HttpError)
			await expect(promise).rejects.toMatchObject({
				message: expect.stringContaining('timeout'),
				status: 0,
			})
		})
	})

	describe('logging', () => {
		it('logs request and response when logLevel is debug', async () => {
			const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
			vi.spyOn(global, 'fetch').mockResolvedValue(
				mockResponse(200, 'OK', { x: 1 })
			)
			const client = new HttpClient({
				logLevel: 'debug',
			})
			await client.request({ url: 'https://example.com', method: 'GET' })
			expect(debugSpy).toHaveBeenCalled()
			const calls = debugSpy.mock.calls.map((c) => c.join(' '))
			expect(calls.some((s) => s.includes('[HttpClient]'))).toBe(true)
			expect(calls.some((s) => s.includes('Request'))).toBe(true)
			expect(calls.some((s) => s.includes('Response'))).toBe(true)
			debugSpy.mockRestore()
		})
	})

	describe('error handling', () => {
		it('throws HttpError with status, statusText, data, request', async () => {
			vi.spyOn(global, 'fetch').mockResolvedValue(
				mockResponse(404, 'Not Found', { code: 'NOT_FOUND' })
			)
			const client = new HttpClient()
			const opts = { url: 'https://example.com/missing' }
			try {
				await client.request(opts)
			} catch (err) {
				expect(err).toBeInstanceOf(HttpError)
				const httpErr = err as HttpError
				expect(httpErr.status).toBe(404)
				expect(httpErr.statusText).toBe('Not Found')
				expect(httpErr.data).toEqual({ code: 'NOT_FOUND' })
				expect(httpErr.request).toBe(opts)
				expect(httpErr.message).toContain('404')
			}
		})
	})
})
