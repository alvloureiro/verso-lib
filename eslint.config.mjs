/**
 * ESLint flat config for TypeScript with SonarJS, Security, and Prettier.
 * Enforces type-only imports for better tree-shaking and bundling.
 */
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier/flat'
import eslintPluginPrettier from 'eslint-plugin-prettier'
import sonarjs from 'eslint-plugin-sonarjs'
import security from 'eslint-plugin-security'

export default tseslint.config(
	{
		ignores: ['dist', 'node_modules', '*.cjs', 'coverage'],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	// Security: single flat config object
	security.configs.recommended,
	{
		files: ['**/*.ts'],
		plugins: {
			prettier: eslintPluginPrettier,
			sonarjs,
		},
		languageOptions: {
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: 'module',
			},
		},
		rules: {
			'prettier/prettier': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					prefer: 'type-imports',
					fixStyle: 'inline-type-imports',
				},
			],
			// SonarJS recommended (legacy plugin; rules applied explicitly)
			...(sonarjs.configs?.recommended?.rules ?? {}),
		},
	},
	prettierConfig,
)
