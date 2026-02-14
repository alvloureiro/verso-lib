# Web example (React / Vue / Angular)

This folder is intended for a small sample app that consumes `verso-lib` in a web context (e.g. React, Vue, or Angular).

## Setup

From the repo root:

```bash
pnpm install
pnpm build
```

Then in your app, depend on the built package (e.g. via `file:../..` or after publishing) and use:

```ts
import { createProvider, GeocodingService, MemoryCache } from 'verso-lib'

const provider = createProvider({ provider: 'google', apiKey: 'YOUR_KEY' })
const cache = new MemoryCache()
const geocoding = new GeocodingService({
  provider,
  cache,
  cacheTtlSeconds: 3600,
})

const result = await geocoding.geocode('New York, NY')
```

Add a minimal React/Vue/Angular app here when ready.
