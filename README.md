# PeakFlix

PeakFlix is a static React and TypeScript website for discovering movies, series, anime, Turkish series, and Korean drama through TMDB.

It has no accounts, backend, or database. Favorites, watch-later items, recent searches, and the last watched season and episode stay only in the visitor's browser using `localStorage`.

## Run locally or in Codespaces

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add your TMDB read access token to `VITE_TMDB_READ_TOKEN`.
5. Run `npm run dev`.

The website opens at `http://localhost:5173`. In GitHub Codespaces, open forwarded port `5173` from the **Ports** tab.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development website |
| `npm run build` | Type-check and create the production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run type-checking and linting |

## Storage and caching

- TMDB responses use a memory and session cache with expiration, stale fallback, request deduplication, and retry handling.
- Watch progress uses versioned browser storage and records the last season and episode for each series.
- No passwords or personal account data are collected.

Never commit a real `.env` file or your TMDB token.
