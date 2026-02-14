# Mobile example (React Native)

This folder is intended for a small sample app that consumes `verso-lib` in a React Native context, sharing 100% of the library logic with web.

## Setup

From the repo root:

```bash
pnpm install
pnpm build
```

In your React Native app, add the dependency (e.g. `file:../..` or published package) and use the same API as in web:

```ts
import { createProvider, RouteService, NoopCache } from 'verso-lib'

const provider = createProvider({ provider: 'mapbox', accessToken: 'YOUR_TOKEN' })
const routeService = new RouteService({ provider, cache: new NoopCache() })

const route = await routeService.getRoute(
  { lat: 40.7128, lng: -74.006 },
  { lat: 40.7589, lng: -73.9851 },
)
```

Add a minimal React Native app here when ready.
