# PeakFlix

PeakFlix is a React streaming-discovery website with a Node/Express account API and PostgreSQL database.

## Run it locally

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in the values.
4. Run `npm run migrate` once to create or upgrade the database.
5. Run `npm run dev`.

The website opens at `http://localhost:5173` and the API at `http://localhost:3000`.

## Production database and account setup

Follow [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md). It explains, in simple steps, how to:

- create the Supabase PostgreSQL database;
- deploy the Express API;
- connect GitHub Pages to the API;
- test real user registration;
- add future database migrations safely.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend and API locally |
| `npm run server` | Start only the API |
| `npm run migrate` | Apply new database migrations safely |
| `npm test` | Run backend tests |
| `npm run typecheck` | Check TypeScript |
| `npm run lint` | Run ESLint |
| `npm run build` | Build the production frontend |

Never commit `.env`, database passwords, JWT secrets, or TMDB tokens to GitHub.
