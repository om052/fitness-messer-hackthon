# Architecture and integration status

## Current components

- `src/main.tsx` mounts React and Clerk. Missing or placeholder Clerk publishable configuration renders an actionable setup screen.
- `src/App.tsx` composes `StoreProvider` and the React Router provider.
- `src/routes/router.tsx` declares public Clerk sign-in/sign-up and authenticated application routes.
- `src/services/apiClient.ts` sends optional Clerk bearer tokens to the configured API base URL and distinguishes transport errors from HTTP errors.
- `server/src/app.ts` mounts Express middleware and `/api/v1` routes.
- `server/src/index.ts` connects MongoDB before listening; startup stops if MongoDB connection fails.
- MongoDB services define profiles, kingdoms, memberships, challenges, and workout reports.

## Current integration boundaries

`GET /api/v1/auth/me` idempotently initializes a persistent player profile with zero XP, strength, and FM for new users. `PATCH /api/v1/auth/me` permits the authenticated user to update only their display name and avatar tone; progression, FM, and role fields are not accepted. `POST /api/v1/auth/onboarding/complete` marks onboarding complete for the authenticated profile without accepting client-supplied state. The onboarding guard restores this value from `GET /api/v1/auth/me` after refresh. Onboarding does not create a local-only kingdom membership. `GET /api/v1/auth/dashboard` aggregates the saved profile with workout reports, verified workout totals, FM ledger entries, memberships, and kingdoms.

Authenticated `POST /api/v1/workouts` stores a client-reported session as `unverified`; it awards zero progression or FM. The idempotency key is the Clerk user ID plus client-generated session UUID. `GET /api/v1/workouts/mine` returns saved reports. No pose verifier or verified-reward writer exists, and the FM ledger is read-only until its trusted writer is implemented.

Kingdom creation and claim share a backend service that validates generated polygon geometry, rejects overlap, reserves expiring grid cells to serialize competing claims, persists the kingdom, and creates the founder's King membership. MongoDB concurrency and TTL recovery integration tests remain required.

Newly created kingdoms now persist six level-one building records with zero progress and zero FM treasury. Kingdom3D loads the stored kingdom and membership role, renders saved building records on a neutral terrain stage, and shows an empty state when there are no saved structures. The member-only building upgrade endpoint uses the central `CONSTRUCTION_COIN_COST_PER_POINT` value (0.5 FM per required progress point) and a conditional single-document update; the operation request ID and audit record are stored on the kingdom document to prevent replay and ensure that spending and building-level changes occur together. The old browser-local demo store instead calculated cost from remaining progress, which could make a completed upgrade cost zero. The server follows the central game rule; this discrepancy is recorded rather than retaining the demo calculation. No verified progression or treasury-funding path currently exists, so new kingdoms cannot yet earn construction progress or fund upgrades.

Claim-cell locks now include an owner token and a 15-minute expiry, with a TTL index, opportunistic deletion of expired/legacy locks, and token-scoped release after success or failure. This prevents stale reservations from blocking territory forever; database-level claim race and expiry recovery tests are still needed.

Authenticated Sabha APIs store announcements with role checks and request idempotency. Challenge history requires membership; challenge creation requires both users to be kingdom members, validates supported exercises and bounded time limits, and uses a request ID for retry safety. Leadership challenges require Senapati-to-King roles. Agreement is persisted, but resolution continues to reject all client-supplied results and requires a server-verified result, which is not yet produced.

The app store still supplies sample kingdoms and local game state to multiple screens. It is not a persistence layer. Notifications, full activity/contribution feeds, treasury funding, worker hiring, verified workout rewards, and verified battle submissions are not implemented as complete vertical slices.

Onboarding location now uses browser geolocation only after a user action and forwards the coordinates to the map for that navigation. The map can create immediate `Member` membership through the existing authenticated kingdom join endpoint; there is no membership approval queue. Demo sample records remain read-only. Their 3D route builds an illustrative, deterministic preview from the stable sample ID; this preview is frontend-only and cannot change persisted kingdom data. Non-sample kingdom scenes continue to use saved building records only.

Kingdom3D renders saved building records at their persisted `[x, z]` positions and does not invent owned buildings for real kingdoms. A deterministic identity-derived terrain seed drives a procedural island, animated ocean shader, instanced forest, river, bridge, and clouds; building geometry reflects supported saved building types and levels, with a generic visual for unknown types. Only sample previews receive additional settlement/farm/mine/harbor scenery. The account HUD reads `/api/v1/auth/dashboard`, the building minimap plots displayed saved coordinates, selected buildings expose their saved details, the Training Yard links to Workout Arena, and a member can navigate from the Palace panel to Sabha. Resource and service operations without backend support are presented as unavailable. World Map navigation state carries center/zoom into Kingdom3D and restores it when returning through the map action. No authenticated browser rendering was verified for this update.

## Intended safe direction

1. Keep Clerk identity authoritative on the backend; never trust submitted user IDs, roles, balances, or workout scores.
2. Add typed persistence/services and validation beside the existing Express routes.
3. Treat each reward or spend as an idempotent ledger operation, with a balance update guarded against stale/negative balances.
4. Return explicit API DTOs and consume them in frontend screens; do not silently substitute fixture data on service errors.
5. Keep fixtures in tests or explicit development-only paths.
6. Require a defined exercise verification and challenge outcome model before enabling competitive rewards or transfers.

Do not assume standalone MongoDB supports transactions. Choose transaction or compensating-write consistency only after verifying the actual deployment topology and testing failure cases.
