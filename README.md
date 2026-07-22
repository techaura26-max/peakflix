# PeakFlix

## Authentication setup

1. Copy [.env.example](.env.example) to .env and fill in the values.
2. Start the app with `npm run dev`.

## Environment variables

Add the following to a .env file at the repository root:

```env
VITE_TMDB_READ_TOKEN=
DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@db.YOUR-PROJECT.supabase.co:5432/postgres
JWT_SECRET=change-this-to-a-long-random-secret
PASSWORD_RESET_SECRET=change-this-to-a-long-random-secret
FRONTEND_URL=http://localhost:5173
BCRYPT_ROUNDS=12
VITE_API_BASE_URL=http://localhost:3000/api
```

### Where to add them
- In the workspace root: [.env.example](.env.example) and a real .env file.
- The frontend reads VITE_* variables from Vite at build time.
- The server reads DATABASE_URL, JWT_SECRET, PASSWORD_RESET_SECRET, FRONTEND_URL, and BCRYPT_ROUNDS from the Node process environment.

## Important notes
- Do not expose database credentials or private secrets in the frontend.
- The backend currently expects the PostgreSQL tables defined in the database migration files and the runtime environment above.

