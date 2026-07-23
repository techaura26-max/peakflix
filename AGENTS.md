# PeakFlix Agent Instructions

PeakFlix is a static React + TypeScript media discovery website backed only by the TMDB API.

## Commands

- Development: `npm run dev`
- Type check: `npm run typecheck`
- Lint: `npm run lint`
- Production build: `npm run build`

## Architecture

- `src/pages`: route pages
- `src/components`: reusable interface components
- `src/services/tmdb.ts`: TMDB client, retry behavior, and response cache
- `src/utils/library.ts`: browser-only favorites, lists, and watch progress
- `src/utils/recommendations.ts`: local personalized ranking
- `src/i18n`: complete English and Arabic interfaces; one active language per visitor

The project intentionally has no account system, database, or application server. Do not add one unless the owner explicitly changes this requirement. Keep browser storage keys prefixed with `peakflix-`, preserve HashRouter compatibility, and never expose secrets other than the public TMDB read token expected by the static frontend.
