# verso-lib

[![npm version](https://img.shields.io/npm/v/verso-lib.svg)](https://www.npmjs.com/package/verso-lib)

**Package:** [verso-lib on npm](https://www.npmjs.com/package/verso-lib)

## Objective
Build a TypeScript library that abstracts access to map APIs (Google Maps, Mapbox, etc.), providing geocoding, distance matrix, and routing functionalities. The library will be consumed by web applications (React, Vue, Angular) and mobile apps (React Native), sharing 100% of the logic.

## Tech Stack

- **Language:** TypeScript (>=4.8)
- **Package Manager:** pnpm (recommended) or yarn/npm
- **Build Tool:** tsup (or vite) to generate bundles compatible with CommonJS and ESModules
- **Testing:** Vitest (or Jest) with code coverage
- **Linting/Formatting:** ESLint + Prettier
- **Publishing:** npm (private repository or public via GitHub Packages)
- **Cache:** Abstract interface for Redis/Memcached (client to be injected)
- **HTTP:** Fetch-based client (isomorphic) or axios

## Directory Structure

```plaintext
verso-lib/
├── src/
│   ├── core/               # Core interfaces and types
│   │   ├── provider.interface.ts
│   │   ├── cache.interface.ts
│   │   └── types.ts
│   ├── providers/           # Concrete provider implementations
│   │   ├── google/          # Google Maps client
│   │   ├── mapbox/          # Mapbox client
│   │   └── index.ts         # Provider factory
│   ├── services/            # Services exposed by the library
│   │   ├── geocoding.service.ts
│   │   ├── distance.service.ts
│   │   ├── route.service.ts
│   │   └── index.ts
│   ├── cache/               # Cache implementations
│   │   ├── redis.cache.ts   # (optional, depends on client)
│   │   ├── memory.cache.ts  # In-memory cache for development
│   │   └── noop.cache.ts    # Disabled cache
│   ├── http/                # Generic HTTP client
│   │   ├── http-client.ts
│   │   └── interceptors.ts  # Logging, retry, etc.
│   ├── utils/               # Utility functions (e.g., haversine)
│   │   └── geo.utils.ts
│   └── index.ts             # Main entry point
├── tests/
│   ├── unit/
│   └── integration/
├── examples/
│   ├── web/                 # React consumption example
│   └── mobile/              # React Native consumption example
├── .eslintrc.cjs
├── .prettierrc
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── package.json
└── README.md

## Setup

- **Package manager:** pnpm
- **Install:** `pnpm install`

## Scripts

| Script          | Description                                      |
|-----------------|--------------------------------------------------|
| `pnpm build`    | Build the library → `dist/` (index.cjs, index.mjs, index.d.ts) |
| `pnpm dev`      | Watch mode: rebuild on file changes              |
| `pnpm test`     | Run tests with Vitest                            |
| `pnpm test:watch` | Run tests in watch mode                        |
| `pnpm test:coverage` | Run tests with code coverage                  |
| `pnpm lint`     | Run ESLint on `src/`                             |
| `pnpm lint:fix` | ESLint with auto-fix                             |
| `pnpm format`   | Format code with Prettier                        |
| `pnpm format:check` | Check formatting with Prettier               |

## Releasing

Releases are automated via GitHub Actions. **With GitFlow**, from your machine:

1. **Commit and push** everything on `develop`.
2. **Update `main` with `develop` (rebase for linear history)** and run the release script:
   ```bash
   git checkout main
   git pull origin main
   git rebase develop
   pnpm release patch   # or release:minor / release:major
   git push origin main && git push origin --tags
   ```
   To use **merge** instead of rebase: `git merge develop -m "chore: merge develop into main for release"` before `pnpm release patch`.
3. **Optional:** sync `develop` with the release:  
   `git checkout develop && git merge main && git push origin develop`

The release script bumps the version, commits, and creates the tag. CI runs on the tag push and publishes to npm.  
**Note:** If `main` was already pushed with a different history, `git rebase develop` rewrites `main`; you may need `git push --force-with-lease origin main` (use only if you are sure no one else is pushing to `main`).

**Manual alternative:** `pnpm version patch` then `git push && git push --tags`.

The workflow runs on every push to `develop` and `main` (lint, test, build). When you push a tag matching `v*`, it runs the same checks and then publishes to npm.

**Publishing uses [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers)** (OIDC)—no long-lived token or 2FA bypass.

**One-time setup (do once per package):**

1. Go to [npmjs.com](https://www.npmjs.com/) → **Packages** → **verso-lib** → **Settings**.
2. Open **Trusted publishing**.
3. Click **GitHub Actions**.
4. Set **Workflow filename** to exactly: `publish.yml`.
5. Save. After that, pushing a `v*` tag will publish from CI with no token.

## Configuration

- **TypeScript:** `tsconfig.json` — module `ES2020`, target `ES2018`, declarations enabled.
- **Build:** `tsup.config.ts` — entry `src/index.ts`, formats `cjs` + `esm`, declarations and source maps.
- **ESLint:** `.eslintrc.cjs` — TypeScript + Prettier (use `ESLINT_USE_FLAT_CONFIG=false` with ESLint 9; see `lint` script).
- **Prettier:** `.prettierrc` and `.prettierignore`.

## Usage

After `pnpm build`, consumers can use:

- **ESM:** `import { createProvider, GeocodingService } from 'verso-lib'`
- **CJS:** `const { createProvider, GeocodingService } = require('verso-lib')`

Types are resolved via the `types` field in `package.json`.

**Long-term API:** Use **`createProvider`** as the main entry point. It is provider-agnostic and extensible (add new providers in one place). **`createMapClient`** is a convenience alias for Google-only usage and remains supported for backward compatibility.

### Geocoding

Use `createProvider({ provider: 'google', apiKey, httpConfig? })` to get a Google Maps provider (geocoding with HTTP retry). Providers do not cache; use **GeocodingService** for caching (option-aware keys, single policy).

**Mapbox:** `createProvider({ provider: 'mapbox', ... })` returns **MapboxProvider**, which is a **stub only** (e.g. `geocode()` returns `[]`). It is kept so that provider-agnostic code and types work; do not use in production until a real Mapbox implementation is added.

Example without cache:

```ts
import { createProvider } from 'verso-lib'

const provider = createProvider({
  provider: 'google',
  apiKey: process.env.GOOGLE_MAPS_API_KEY!,
})
const results = await provider.geocode('Av. Paulista, 1000, São Paulo')
```

Example with cache (GeocodingService):

```ts
import { createProvider, GeocodingService, MemoryCache } from 'verso-lib'

const provider = createProvider({ provider: 'google', apiKey: process.env.GOOGLE_MAPS_API_KEY! })
const service = new GeocodingService({
  provider,
  cache: new MemoryCache(),
  cacheTtlSeconds: 7 * 24 * 60 * 60,
})
const results = await service.geocode('Av. Paulista, 1000, São Paulo', { region: 'br' })
```

To force a fresh result (bypass cache), pass `skipCache: true`: `service.geocode('Address', { skipCache: true })`.

**Note:** Respect provider rate limits (e.g. Google Geocoding API quotas). Use throttling or a queue in high-throughput scenarios.

### Place Autocomplete (Address Normalization)

Use **`provider.autocomplete(input, options?)`** to get place suggestions as the user types. The Google provider calls the Places Autocomplete API and returns an array of **PlacePrediction** objects (each with `description` and `placeId`). Use the `placeId` later for geocoding or place details.

**Options:** `language`, `components` (e.g. `{ country: 'br' }` or `{ country: ['br', 'pt'] }`), `location`, `radius`, `types` (e.g. `'address'`), and **`sessionToken`** (recommended for per-session billing: generate on the client and pass through). On empty input or API/network errors, the method returns an empty array (no throw).

```ts
import { createProvider, type PlacePrediction, type AutocompleteOptions } from 'verso-lib'

const provider = createProvider({ provider: 'google', apiKey: process.env.GOOGLE_MAPS_API_KEY! })
const opts: AutocompleteOptions = { language: 'pt-BR', components: { country: 'br' }, sessionToken: 'client-generated-token' }
const predictions: PlacePrediction[] = await provider.autocomplete('Av. Paulista', opts)
// predictions[0].description, predictions[0].placeId
```

Mapbox provider stub returns `[]` for `autocomplete` until implemented.
