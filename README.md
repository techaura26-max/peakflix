# PeakFlix

## Authentication setup

1. Create a Supabase project.
2. Open the SQL editor and run the contents of [supabase/schema.sql](supabase/schema.sql).
3. Copy [.env.example](.env.example) to .env and fill in the values.
4. Start the app with `npm run dev`.

## Environment variables

Add the following to a .env file at the repository root:

```env
VITE_TMDB_READ_TOKEN=
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=YOUR-ANON-KEY
DATABASE_URL=postgresql://postgres:YOUR-PASSWORD@db.YOUR-PROJECT.supabase.co:5432/postgres
JWT_SECRET=change-this-to-a-long-random-secret
VITE_API_BASE_URL=/api
```

### Where to add them
- In the workspace root: [.env.example](.env.example) and a real .env file.
- The frontend reads VITE_* variables from Vite at build time.
- The server reads SUPABASE_*, DATABASE_URL, and JWT_SECRET from the Node process environment.

## Important notes
- Do not expose the database password, service role key, or private secrets in the frontend.
- The server uses the Supabase anon key only for database access in this implementation and expects your Supabase project to have the tables from [supabase/schema.sql](supabase/schema.sql).

