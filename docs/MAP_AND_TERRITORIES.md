# Map and territory status

## Implemented

- The World Map uses Leaflet with MapTiler tiles when configured and an OpenStreetMap tile fallback.
- MapTiler and OpenStreetMap attribution are included in the map UI.
- Saved kingdom center points and valid saved GeoJSON polygon/multipolygon geometry are rendered from kingdom API responses.
- Browser geolocation is requested only after the user activates the location control.
- First-run onboarding also offers a user-initiated geolocation request. A successful result centers the map for that navigation and displays its reported accuracy; coordinates are not written to the player profile. Denied, unavailable, or skipped location does not silently substitute a simulated user position. Manual map navigation and place search remain available.
- Kingdom discovery uses `/api/v1/kingdoms/nearby` and `/api/v1/kingdoms/all`, merging by stable MongoDB `_id`.
- Kingdom creation and claim flows call authenticated backend endpoints.
- A selected persisted non-sample kingdom can be joined using authenticated `/api/v1/kingdoms/:id/join`; the current backend operation immediately creates `Member` membership (no approval queue). Sample kingdoms and the kingdom's own King are not joinable through that operation. Account navigation is refreshed after success.
- Selecting an explicitly marked sample kingdom opens a deterministic, read-only 3D preview with illustrative buildings and settlement scenery generated from its stable ID. Preview structures are not written to MongoDB, do not create owners/members/treasury, and cannot be upgraded. Real kingdom scenes continue to use persisted building records only.
- Kingdom creation and claim save a generated, validated GeoJSON game polygon, use server-side overlap checks and expiring owner-token grid-cell reservations, and create the founder's King membership plus six saved level-one buildings with zero progress.
- Kingdom creation uses authenticated API operations, while workout history uses authenticated MongoDB-backed APIs. The local store is not used to award territory or workout rewards.

## Limitations requiring resolution

- Some seeded kingdoms are explicitly fictional development samples; they are not real owners or real territories.
- The claim endpoint can create a square game territory from a selected coordinate. This is a game boundary, not a surveyed/legal parcel.
- Claim reservations expire after 15 minutes, are released on completed requests, and expired/legacy locks are opportunistically cleaned. TTL and collision behavior still need MongoDB-backed fault/recovery tests.
- Geometry collision rules have unit coverage, but overlapping claims have not been stress-tested against MongoDB or under concurrent API requests.
- Claiming and authenticated map persistence have not been integration-tested in a live signed-in browser session during this review.
- Geolocation permission and location-based discovery were not exercised in an authenticated browser during this review.
- Map-to-demo 3D preview and visual differentiation between separate sample seeds were not browser-tested.
- The new join route unit tests mock MongoDB collections; the membership create/retry flow was not tested against a live database or multiple concurrent users.
- MapTiler requires a valid key and applicable provider plan/usage compliance. OpenStreetMap tiles remain subject to its usage policy.

Do not represent sample territory data as verified ownership. Do not treat fictional game polygons as legal property boundaries.
