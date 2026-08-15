# Runtime and release architecture

The browser application is a React 18/Vite single-page app. `src/config/routeManifest.js` is the route metadata authority; `src/routes/lazyPages.js` supplies explicit Vite-splittable loaders; `src/App.jsx` supplies authentication and staff layout boundaries.

Base44 provides authentication, entities, functions, workflows, agents, connectors, and hosting. Files under `base44/` are deployable configuration, not a local database.

## Trust boundaries

- `VITE_*` values are public build data, never secrets.
- App id, backend origin, and function version come from the build environment. Query strings/local storage cannot override them.
- Callback access tokens are removed from the URL before render and applied to the SDK only after a current-user verification request succeeds.
- Public, authenticated, and staff routes are classified in the route manifest. Only public discovery routes may be indexable.
- Client error reporting is local by default. If `VITE_CLIENT_ERROR_ENDPOINT` is set, it must resolve to the current origin and receives no message, stack, user id, email, or URL query.

## Known deployment constraint

Backend functions currently use shared relative imports. Local Deno validation verifies the graph, but Base44 support for deploying those imports must be confirmed against the target environment before release. `npm run validate:config` reports the current count rather than claiming deployment parity.
