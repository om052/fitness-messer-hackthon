# Workout verification status

## Current behavior

Exercise definitions and instructional copy exist in `src/data/exercises.ts`. The Workout Arena requests a user-authorized video stream and, when available, initializes a real MediaPipe Pose Landmarker for supported rep-based exercises such as push-ups and squat variants. It performs live landmark analysis, overlays the skeleton, and counts a rep only after a complete movement cycle without duplicate counting.

The browser still submits authenticated self-reported quantities/durations for the seven supported exercise IDs to `POST /api/v1/workouts`; reports persist with `status: "unverified"` and zero XP, strength, and coins. The same session UUID and payload can be retried idempotently; a conflicting payload for that UUID returns 409. The browser reuses the session UUID on a failed submission retry and clearly labels reports as unverified. The dashboard can read recent reports and counts from the backend.

## Not implemented

- Trusted verification evidence and server-side eligibility rules for workout rewards.
- Server-calculated XP/strength/FM rewards and a persistent FM transaction writer.
- GPS-verified walking or device integrity protections.
- Production-grade cheat-resistant competition; even a future pose pipeline will have documented abuse limits.

## Safe implementation prerequisites

Select the supported browser/Android runtime and inference model, document privacy/data retention, then implement exercise-specific validation and test fixtures. The backend must accept verified events or evidence from a trusted verifier boundary, calculate rewards itself, and reject duplicate session submissions. Never award verified rewards from a client-supplied quantity alone.

The current reports are intentionally only user-submitted history. Camera preview, timer duration, and manual quantity are not verification and cannot earn game rewards.
