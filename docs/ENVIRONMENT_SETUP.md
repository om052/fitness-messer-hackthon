# Environment setup

Do not copy credentials into source code, documentation, chat, or a committed file. The root and backend example files use placeholders. Obtain real keys from the relevant service dashboards.

## Frontend

Create or update `D:\kurukshetra-main\.env.local`:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=pk_test_<your-clerk-publishable-key>
VITE_API_BASE_URL=http://localhost:4000/api/v1
VITE_MAPTILER_KEY=<your-maptiler-key>
```

`VITE_CLERK_PUBLISHABLE_KEY` and `VITE_MAPTILER_KEY` are browser-visible values by design. Never place Clerk secret keys, MongoDB URIs, or private API tokens in a `VITE_` variable. MapTiler may be omitted to use the configured OpenStreetMap fallback.

## Backend

Create or update `D:\kurukshetra-main\server\.env`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/fitness_messer
PORT=4000
FRONTEND_ORIGIN=http://127.0.0.1:5175
CLERK_SECRET_KEY=sk_test_<your-clerk-secret-key>
CLERK_PUBLISHABLE_KEY=pk_test_<your-clerk-publishable-key>
```

Use matching keys from the same Clerk instance. Never copy example placeholders as actual credentials. If a real secret was committed or otherwise exposed, rotate it with its provider.

## Start services

Ensure MongoDB is available, then use separate PowerShell terminals:

```powershell
Set-Location D:\kurukshetra-main\server
npm run dev
```

```powershell
Set-Location D:\kurukshetra-main
npm run dev -- --host 127.0.0.1 --port 5175
```

The backend connects to MongoDB before it starts listening. Check `http://127.0.0.1:4000/api/v1/health` for process health and `http://127.0.0.1:4000/api/v1/ready` for database readiness. Do not treat the health endpoint as proof of authenticated API success.
