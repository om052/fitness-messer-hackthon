# Testing

Run commands from the indicated directory.

## Frontend

```powershell
Set-Location D:\kurukshetra-main
npm run typecheck
npm run build
```

There is no frontend `test` script in the root package manifest.

## Backend

```powershell
Set-Location D:\kurukshetra-main\server
npm run typecheck
npm test
npm run build
```

The backend tests cover authentication rejection paths using a mocked Clerk boundary, profile field validation and authenticated ownership, onboarding-completion authorization/input rejection, kingdom join authorization/sample/self/duplicate checks and unique-index conflict handling, challenge agreement rules, unverified workout reward/idempotency rules, workout API validation/authorization/replay behavior using an isolated in-memory test collection, territory polygon geometry, initial persisted building records/construction cost rules, building-upgrade route authorization/response behavior, Sabha announcement permissions/idempotency, and challenge creation authorization/idempotency. They do not establish live Clerk token verification, MongoDB persistence, kingdom claim/building upgrade concurrency, or end-to-end game functionality.

## Service checks

```powershell
Invoke-RestMethod http://127.0.0.1:4000/api/v1/health
Invoke-RestMethod http://127.0.0.1:4000/api/v1/ready
```

`/health` tests the HTTP process. `/ready` tests its MongoDB connection. Neither replaces a signed-in browser/API journey.

## Latest verified scope

Latest checks after connecting Profile/navigation, persistent onboarding, live-location handoff, kingdom membership join, and the sample-only 3D preview: frontend `npm run typecheck` and `npm run build` passed; backend `npm run typecheck` and `npm run build` passed; backend `npm test` passed (37 tests across 11 files). Vite emitted the existing large-chunk warning. Route tests use mocked authentication and collection/service boundaries, so live Clerk verification and MongoDB writes were not exercised. Browser navigation rendered Clerk sign-in; no authenticated browser journey was available. Geolocation permission, map membership mutation, sample preview rendering, workout reward processing, territory/building concurrency, persisted construction, Sabha mutations, and multiplayer outcomes remain unverified.

During the same review, the running local API returned `{"status":"ok"}` from `/api/v1/health` and `{"status":"ready","database":"connected"}` from `/api/v1/ready`. Unauthenticated GET `/api/v1/auth/me` and POST `/api/v1/auth/onboarding/complete` each returned HTTP 401. These smoke checks do not test authenticated MongoDB profile writes.

After adding live-location onboarding, a map join action, and a sample-only 3D preview, frontend `npm run typecheck`, `npm run build`, backend `npm run typecheck`, `npm test` (37 tests), and backend `npm run build` were rerun and passed. Geolocation permission, kingdom membership mutation, demo preview rendering, and refreshed navigation were not exercised in a signed-in browser; authenticated membership persistence is therefore unverified.

After the procedural Kingdom3D scene, authenticated account HUD, building minimap/context actions, and map-view restoration changes:

- Frontend `npm run typecheck`: passed.
- Frontend `npm run build`: passed; Vite reported the large JavaScript chunk warning.
- Backend `npm run typecheck`: passed.
- Backend `npm test`: passed, 41 tests across 12 files.
- Backend `npm run build`: passed.
- Browser smoke check for `http://localhost:5175/kingdom/sample-empire`: redirected to `/login`; no authenticated browser session was available, so the 3D scene, controls, HUD values, and map return were not visually exercised.

These are compilation/unit-test results, not evidence of live MongoDB building data, WebGL rendering, camera controls, or authenticated map-to-kingdom navigation. No frontend test script exists in the root package manifest.
