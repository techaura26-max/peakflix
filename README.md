# PeakFlix

PeakFlix is a production-style React and TypeScript media discovery website powered by TMDB. It covers movies, series, anime, Korean drama, and Turkish series without accounts, a backend, or a database.

## Highlights

- Bilingual, typo-tolerant live autocomplete ranked by title match, popularity, rating, and vote confidence
- Quick title previews that keep visitors on the current catalog page
- Advanced search filters for media type, genre, original language, year, and rating
- Personalized recommendations based on local favorites, watch later, history, watched titles, and recent activity
- Detailed title pages with trailers, cast, directors, ratings, runtime, seasons, providers, sharing, and similar picks
- Browser-only library with favorites, watch later, history, watched titles, exact player progress when provided, export, and import
- Previous/next episode navigation across season boundaries, with VidSrc first by default and SmashyStream first for anime
- Installable PWA with an offline shell, persistent TMDB cache, update notices, responsive navigation, and reduced-motion support
- 22 complete interface languages, alphabetically organized; each visitor sees one selected language, saved in the browser
- Multilingual TMDB search with script detection for Arabic, Persian, Chinese, Japanese, Korean, Russian, Hindi, Bengali, Punjabi, Tamil, and Thai queries
- SEO metadata, structured movie/TV data, legal pages, TMDB attribution, error boundaries, and automated tests

## Run locally or in Codespaces

1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Add a TMDB read access token to `VITE_TMDB_READ_TOKEN`.
5. Run `npm run dev`.

The website opens at `http://localhost:5173`. In GitHub Codespaces, open forwarded port `5173` from the **Ports** tab and set its visibility as needed.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development website |
| `npm run build` | Type-check and create the production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run automated search, storage, and navigation tests |
| `npm test` | Run type-checking, linting, and all unit tests |

## Privacy and browser storage

- No passwords, profiles, or personal account data are collected.
- Favorites, history, search terms, watched episodes, player time updates, and the last selected season and episode stay in `localStorage` on the visitor's device.
- The library can be exported to JSON and imported into another browser.
- Clearing the browser's site data removes the local library and progress.
- TMDB responses use persistent browser caching with expiration, stale fallback, request deduplication, retry handling, and quota cleanup.

Never commit a real `.env` file or TMDB token. The GitHub Pages workflow expects the repository Actions secret `VITE_TMDB_READ_TOKEN`.

## Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB. PeakFlix does not host media files; third-party availability remains the responsibility of its respective providers.
