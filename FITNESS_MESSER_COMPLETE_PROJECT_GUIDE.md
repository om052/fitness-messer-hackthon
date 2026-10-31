# FITNESS MESSER — COMPLETE PROJECT GUIDE

## Table of Contents
1. What Fitness Messer Is
2. Technology Stack
3. Environment Variables
4. Application Features
5. API Endpoints
6. Database and Data Model
7. Important Files and Folders
8. Data Flow
9. Current Status and Known Issues
10. How to Run the Project
11. What Our Team Should Do Next

## 1. What Fitness Messer Is
Fitness Messer is a fitness-themed strategy game. Users train, earn rewards, join/create kingdoms, view a satellite world map, and enter a 3D kingdom.

## 2. Technology Stack
- Frontend: React, TypeScript, Vite
- Backend: Express, TypeScript
- Database: MongoDB
- Auth: Clerk
- Map: Leaflet/React Leaflet + MapTiler
- 3D: React Three Fiber, Three.js, Drei
- Styling: Tailwind CSS
- State: React hooks + context

## 3. Environment Variables
Frontend:
- VITE_MAPTILER_KEY (public map tiles)
- VITE_CLERK_PUBLISHABLE_KEY (public Clerk key)
- VITE_API_BASE_URL (backend base, default http://localhost:4000/api/v1)

Backend:
- MONGODB_URI (database connection)
- PORT (default 4000)
- FRONTEND_ORIGIN (CORS origin)
- CLERK_SECRET_KEY (server secret)
- CLERK_PUBLISHABLE_KEY (server publishable)

## 4. Features
- Authentication via Clerk
- Dashboard with user/kingdom data
- World Map with real geolocation and satellite tiles
- Kingdom creation (authenticated)
- Kingdom3D scene
- Workouts/gamification (mock/local)
- Sabha, profile

## 5. API Endpoints
- GET /api/v1/health
- GET /api/v1/ready
- GET /api/v1/auth/me (protected)
- GET /api/v1/kingdoms/nearby?lat=&lng=&radius=
- GET /api/v1/kingdoms/:id
- GET /api/v1/kingdoms/mine (protected)
- POST /api/v1/kingdoms (protected)
- GET /api/v1/kingdoms/:id/members

## 6. Database
MongoDB collections: profiles, kingdoms, memberships. Kingdoms have 2dsphere index on center. Memberships unique per kingdom/user. Seed demo kingdoms idempotently.

## 7. Files
- src/main.tsx: app entry, ClerkProvider
- src/App.tsx: router provider
- src/pages/WorldMap/WorldMap.tsx: map, location, territories
- src/pages/Dashboard/Dashboard.tsx: dashboard
- src/pages/Kingdom3D/index.tsx: 3D page
- server/src/app.ts: Express app
- server/src/db.ts: MongoDB connection
- server/src/routes/*.ts: routes
- server/src/services/*.ts: data access

## 8. Data Flow
User -> Clerk auth -> frontend -> Express API -> MongoDB -> response -> UI.

## 9. Status
- Typecheck/build pass.
- Live Clerk auth and E2E not verified without keys.
- Dashboard real data implemented but live unverified.

## 10. Run Project
Frontend:
npm install
npm run dev
Backend:
cd server
npm install
npm run dev

## 11. Next Steps
- Configure Clerk keys
- Run live E2E
- Verify 3D scene
- Add tests
EOF