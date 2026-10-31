# Fitness Messer project status

This status records observed implementation, not the intended product roadmap. Last reviewed: 2026-10-31.

## Architecture and runtime

- Frontend: React, TypeScript, Vite, React Router, Clerk React, Leaflet, and React Three Fiber.
- Backend: Express, TypeScript, Clerk Express middleware, MongoDB Node driver, and Zod.
- Backend routes currently mounted under `/api/v1`: health/readiness, `/auth/me`, `/auth/dashboard`, `/auth/onboarding/complete`, kingdoms, challenges, Sabha announcements, and workout reports.
- Local environment check during this review: Vite on port 5175, API on port 4000, MongoDB on port 27017; `/api/v1/ready` reported database connected.
- The source directory has no Git metadata, so branch state and commit status cannot be established here.

## Implemented, with limitations

- Clerk-backed sign-in screens and server middleware exist. Browser sign-in depends on external Clerk services being reachable.
- `/auth/me` creates or updates a MongoDB player profile with Clerk ID, optional display name, XP, strength, and FM balance. New profiles start with zero progression; legacy profiles missing progression fields are repaired to zero.
- `/auth/dashboard` reads the authenticated profile, workout counts/history, FM transaction records, memberships, and kingdoms from MongoDB. Rewards are not yet produced by a trusted verification flow, and the FM ledger currently has no transaction-writing endpoint.
- Profile display name and avatar tone can be updated through authenticated `PATCH /auth/me`; the server accepts only those fields for the current Clerk user. Profile and shared navigation now read profile progression, FM, workout summary, kingdom membership, and transactions from the backend rather than local demo state.
- Onboarding completion is persisted on the authenticated MongoDB profile through `POST /auth/onboarding/complete`; the onboarding guard reloads this server field so a page refresh does not restart onboarding. Onboarding no longer creates fictional local kingdom memberships; players can continue independently or open the real map.
- Authenticated `POST /workouts` and `GET /workouts/mine` persist client-reported sessions as explicitly unverified, with zero rewards. Reusing the same session ID and payload is idempotent; conflicting reuse returns 409.
- Kingdom creation and claim share server-side polygon validation, GeoJSON overlap checks, expiring database-backed claim-cell locks, kingdom persistence, six level-one building records with zero progress, and King membership creation. These game polygons are generated squares, not legal property boundaries. MongoDB claim races have not been integration-tested.
- Kingdom3D loads saved kingdom/building/treasury data and membership role from API endpoints. Persisted buildings are rendered only from saved records, at their saved positions, on deterministic island terrain seeded by kingdom identity. The scene now has height-varied, vertex-colored terrain, an animated shader ocean, instanced decorative forest, river, bridge, clouds, and level/type-specific building geometry; missing records still get an honest empty state. A member-only, idempotent upgrade endpoint conditionally updates the saved building and treasury and embeds an audit operation on the same kingdom document. The server follows the central 0.5 FM/progress-point rule; the old browser demo used remaining progress, which could reduce completed upgrade costs to zero.
- Construction still cannot progress for new kingdoms because only verified workouts may contribute, and no verifier/reward path exists. Initial treasuries are zero; no funding or worker-hiring API is present, so the upgrade UI remains unavailable until legitimate persisted progress and treasury exist.
- Sabha now loads the authenticated kingdom, member roles, saved announcements, and persistent challenges from backend APIs. King/Mantri/Senapati announcement permission is checked on the server. Challenge creation is idempotent, restricted to kingdom members, and leadership challenges require a Senapati challenger and King defender. Agreement state persists; resolution remains blocked without a server-verified result.
- World Map uses Leaflet, real map tiles, kingdom APIs, saved geometry overlays, and browser location only after user action. Some sample records are fictional and marked as samples.
- First-run location onboarding now requests device geolocation only after the user activates it, reports location accuracy, and passes the coordinates to the map for that navigation. No default/fabricated point is represented as the user's position; denying or skipping location leads to the generic world map where the user can navigate manually. The map then queries nearby saved kingdom records around its current view.
- The map can join a persisted, non-sample kingdom using the authenticated `/kingdoms/:id/join` API. The server assigns only the `Member` role and rejects sample kingdoms, self-join, and already-member cases. Navigation refreshes the account snapshot after successful join. This is immediate membership under the current API behavior, not an approval-request workflow.
- Sample kingdoms open a read-only 3D preview with deterministic illustrative buildings and demo-only roads, walls, village scenery, farms, mine, and harbor. Layout rotation and preview state derive from the stable sample ID; these additions are generated locally, labeled as illustrative, and are not submitted to APIs or presented as saved real construction. Persisted real kingdoms render only saved building records plus non-owned natural scenery.
- The Kingdom3D screen includes a minimap plotting displayed building coordinates, a selected-building label/panel, and an account HUD loaded from `/auth/dashboard`; when quest data is unavailable it shows an honest empty state. Training buildings link to Workout Arena, and member-accessible capitals link to Sabha. Resource/service actions for mine, farm, port, research, and housing remain explicitly unavailable. Returning from a map-selected kingdom carries the prior map center and zoom back to World Map.
- The available browser redirected a protected Kingdom3D URL to Clerk sign-in. No authenticated scene render, camera interaction, saved-building selection, or live MongoDB data was browser-verified. The scene uses procedural geometry, not an external 3D model or image texture; no added model/API key is required.
- Challenge agreement locks conditions and requires both participants to agree. Resolution requires a stored server-verified result. No result-verification pipeline currently writes that result, so battle resolution is intentionally unavailable.

## Incomplete or demo/local-only

- `src/features/store/useAppStore.ts` still initializes local mock kingdoms, Sabha activity, announcements, challenges, and notifications. Browser-saved identity, progression, transactions, and workout records are no longer trusted or hydrated from local storage.
- Workout Arena can save a self-reported session for any supported exercise, but it does not analyze pose landmarks. Such reports are unverified and never earn XP, strength, FM, or building contribution.
- No server-authoritative verified-workout reward pipeline or FM transaction ledger writer exists yet. The dashboard reads real profile data and honestly displays zero verified workouts and empty transactions for new profiles.
- Other Sabha activity/contribution areas and broader app screens still use local/demo data; this Sabha explicitly does not display those demo events as real.
- Demo/sample kingdom records can be viewed but cannot be joined. Their generated 3D scenes are illustrative previews only; no client-only visual test or authenticated map-to-preview browser workflow was performed.
- Profile editing is limited to display name and avatar tone. XP, strength, FM, verified workouts, kingdom actions, and role changes remain server-managed; no progression mutation endpoint is available without a trusted reward source.
- No verified-workout reward pipeline, player FM transaction ledger writer, treasury funding/worker API, verified battle result API, or full persisted activity/contribution feed is present.

## Environment and operational notes

- Root `.env.local` and `server/.env` are local-only and are not documented with their values here.
- Example environment files contain placeholders only. Populate local values from the relevant provider dashboards; never commit `.env.local` or `server/.env`.
- Clerk browser authentication requires reachable Clerk services; MapTiler tiles require a valid provider key. OpenStreetMap fallback is configured.
- The backend now aborts startup if MongoDB cannot be connected rather than listening in a misleading partially initialized state.

## Validation run during this review

- After connecting Profile/navigation, persistent onboarding, geolocation handoff, real kingdom join UI, and demo-only 3D preview (2026-10-31):
  - Frontend `npm run typecheck`: passed.
  - Frontend `npm run build`: passed; Vite reports a large JavaScript chunk warning.
  - Backend `npm run typecheck`: passed.
  - Backend `npm test`: passed, 37 tests across 11 files, including profile/onboarding and kingdom-join route tests.
  - Backend `npm run build`: passed.
- Profile/onboarding/join route tests mock authentication and collection/service boundaries; they do not prove live MongoDB persistence, live Clerk tokens, or concurrent multi-user membership behavior.
- Live local `/api/v1/health`: returned `{"status":"ok"}`; `/api/v1/ready` returned `{"status":"ready","database":"connected"}` during this review.
- Live unauthenticated GET `/api/v1/auth/me` and POST `/api/v1/auth/onboarding/complete`: both returned 401.
- Frontend HTTP and browser render: the dashboard URL redirected to the Clerk sign-in screen; the page rendered and the browser reported only Clerk/React Router warnings. No signed-in account was available for dashboard/workout/kingdom end-to-end testing.
- The running API reported healthy/ready; unauthenticated requests to `/auth/dashboard` and `/workouts/mine` returned 401 as expected. These checks do not verify authenticated database queries or a signed-in user journey.
- The signed-in browser had no authenticated session; persistent Sabha, 3D kingdom, announcement, challenge, or construction mutations were not exercised in a browser.
- Live MongoDB building-upgrade concurrency, territory-claim races/TTL recovery, construction funding/progression, pose-based exercise verification, and verified battle outcomes: not verified.
- After the Kingdom3D environment/HUD/map-return update: frontend `npm run typecheck` passed; the frontend production build passed with the large JavaScript chunk warning; backend `npm run typecheck`, `npm test` (41 tests across 12 files), and `npm run build` passed. These checks do not substitute for an authenticated browser render or MongoDB gameplay integration test.

## Dependency-ordered next steps

1. Define trusted exercise verification before enabling any server-authoritative XP, strength, FM, or building rewards; add a persistent FM ledger and transactionally/idempotently update profile balances.
2. Connect profile editing and the full workout-history view to persistent APIs; add isolated MongoDB integration tests.
3. Add database-level kingdom claim/concurrency tests and cleanup or recovery for interrupted claim-cell locks.
4. Persist challenge transitions/results and implement an approved verification/compromise/surrender flow before enabling outcome mutation.
5. Isolate remaining fixtures to tests or explicitly gated development-only routes; run authenticated browser journeys with configured Clerk and live MongoDB.

No claim of production readiness is made.
