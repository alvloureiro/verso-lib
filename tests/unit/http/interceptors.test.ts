import { describe, it, expect } from 'vitest'
import { redactSensitiveParamsFromUrl } from '@/http/interceptors'

describe('redactSensitiveParamsFromUrl', () => {
	it('redacts key query parameter', () => {
		const url =
			'https://maps.googleapis.com/maps/api/geocode/json?address=Av.+Paulista&key=secret-key-123'
		expect(redactSensitiveParamsFromUrl(url)).toBe(
			'https://maps.googleapis.com/maps/api/geocode/json?address=Av.+Paulista&key=***'
		)
	})

	it('redacts api_key and access_token', () => {
		const url = 'https://api.example.com?api_key=abc&access_token=xyz&foo=bar'
		const out = redactSensitiveParamsFromUrl(url)
		expect(out).not.toContain('abc')
		expect(out).not.toContain('xyz')
		expect(out).toContain('foo=bar')
		expect(out).toContain('api_key=***')
		expect(out).toContain('access_token=***')
	})

	it('is case-insensitive for param names', () => {
		const url = 'https://api.example.com?API_KEY=secret&Key=another'
		const out = redactSensitiveParamsFromUrl(url)
		expect(out).not.toContain('secret')
		expect(out).not.toContain('another')
		expect(out).toContain('***')
	})

	it('leaves non-sensitive params unchanged', () => {
		const url = 'https://api.example.com?address=Rua+Augusta&language=pt-BR'
		const out = redactSensitiveParamsFromUrl(url)
		expect(out).toContain('address=')
		expect(out).toContain('language=pt-BR')
		expect(out).not.toContain('***')
	})

	it('handles relative URL with query string', () => {
		const url = '/geocode/json?key=my-secret&address=Test'
		const out = redactSensitiveParamsFromUrl(url)
		expect(out).not.toContain('my-secret')
		expect(out).toContain('key=***')
		expect(out).toContain('address=Test')
	})

	it('does not throw for any input and returns a string', () => {
		expect(() => redactSensitiveParamsFromUrl('')).not.toThrow()
		expect(typeof redactSensitiveParamsFromUrl('')).toBe('string')
		// When URL parsing throws, implementation returns original url
		expect(typeof redactSensitiveParamsFromUrl('not-a-url:::')).toBe('string')
	})
})
