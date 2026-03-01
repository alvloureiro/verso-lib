import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			include: ['src/**/*.ts'],
			// Barrels and stub excluded so threshold applies to rest of src/
			exclude: [
				'src/**/*.d.ts',
				'tests/**',
				'src/index.ts',
				'src/services/index.ts',
				'src/providers/mapbox/mapbox-provider.ts',
			],
			// Target 90%; raised from 80/85 as coverage for redis, distance, route, core is added
			thresholds: {
				lines: 80,
				statements: 80,
				functions: 90,
				branches: 85,
			},
		},
	},
	resolve: {
		alias: {
			'@': resolve(__dirname, 'src'),
		},
	},
})
