# PeakFlix2 Agent Instructions

PeakFlix2 is a React + TypeScript media streaming platform frontend that integrates with TMDB API. It supports 7 languages (English, Arabic, Spanish, Japanese, Italian, German, French) and features multiple media categories including anime and Turkish content.

## Quick Start

- **Dev**: `npm run dev` (Vite @ http://localhost:5173)
- **Build**: `npm run build` (type-checks with tsc, then vite build)
- **Lint**: `npm run lint` (ESLint)
- **Env**: Set `VITE_TMDB_READ_TOKEN` for TMDB API access

## Architecture & Key Patterns

### Component Structure
- **Pages** (`src/pages/`): Route handlers (HomePage, CategoryPage, DetailsPage, SearchPage, WatchPage, LoginPage)
- **Components** (`src/components/`): Reusable UI (MediaCard, MediaRow, Navbar, Hero, Layout, MediaSkeleton)
- **Context** (`src/context/`): AuthContext for login state (demo: admin/admin)
- **Services** (`src/services/tmdb.ts`): TMDB API client with language-aware requests
- **Hooks** (`src/hooks/useLocalizedMedia.ts`): Localization utilities for media titles/descriptions
- **Utils** (`src/utils/`): Storage (auth/language prefs), library management

### Data Flow
1. **Routing**: HashRouter with React Router (no server-side routing needed)
2. **Auth**: Local storage + AuthContext (stateless, hardcoded demo account)
3. **Media**: TMDB API → cached in localStorage → mapped to app media types
4. **Localization**: i18next + useLocalizedMedia hook for dual title/description fields

### Media Type System
```typescript
type MediaType = 'movie' | 'series' | 'anime' | 'turkish-drama' | 'turkish-series'
```
Determined by TMDB type + genre + language:
- Turkish films → 'turkish-drama'
- Turkish TV → 'turkish-series'  
- Genre 16 → 'anime' (regardless of language)
- Otherwise: 'movie' or 'series'

### Localization
- **Languages**: en, ar, es, ja, it, de, fr
- **Storage**: `localStorage.peakflix-language`
- **TMDB Integration**: Converts language codes to TMDB format (e.g., 'ar' → 'ar-SA')
- **Media Fields**: Each item has `title`/`titleAr` and `description`/`descriptionAr` (Arabic shown conditionally)

## Development Patterns

### Component Writing
- Use **Framer Motion** for animations (common: `whileHover={{ y: -8, scale: 1.02 }}`)
- Use **Lucide React** icons (e.g., `Play`, `Star`, `Search`)
- Prefer **functional components** with hooks
- Components are minified (single-line returns acceptable for simple components)

### Adding Features
- **New page**: Add to `src/pages/`, update routing in `App.tsx`
- **New endpoint**: Add to `src/services/tmdb.ts`, follow language parameter pattern
- **New locale strings**: Add to `src/i18n/index.ts` (both en and ar at minimum)
- **New hook**: Add to `src/hooks/`, export for reuse across pages/components

### TMDB API Usage
```typescript
// Language-aware by default via getCurrentLanguage()
// Add language parameter: params={{ language: getCurrentLanguage() }}
```

## Common Pitfalls

1. **Forgetting auth check**: LoginPage exists but pages don't enforce auth—add guards if needed
2. **Hardcoded English**: Always use i18next keys, never hardcode text
3. **Missing Arabic translations**: Add to both `en.translation` and `ar.translation` in i18n
4. **Language parameter in TMDB calls**: Some endpoints require explicit language param (check tmdb.ts for pattern)
5. **Local storage keys**: Must use `peakflix-` prefix (see storage.ts)

## File Reference

| File | Purpose |
|------|---------|
| `src/App.tsx` | Route definitions (HashRouter config) |
| `src/main.tsx` | Bootstrap (AuthProvider, i18n setup) |
| `src/services/tmdb.ts` | TMDB API client (media fetching, language handling) |
| `src/context/AuthContext.tsx` | Auth state & login logic |
| `src/hooks/useLocalizedMedia.ts` | Localization helpers for media rendering |
| `src/i18n/index.ts` | i18next config & all locale strings |
| `src/types/media.ts` | MediaItem & MediaType definitions |
| `src/utils/storage.ts` | localStorage wrappers (auth, language, library) |
| `vite.config.ts` | Vite config (React plugin, base: './', for HashRouter) |

## When to Ask for Clarification

- **Auth requirements**: Confirm if pages need protected routes before adding auth guards
- **New media type**: Verify category before adding to type system
- **Language support**: Ask if new language needs TMDB locale mapping
- **API changes**: Confirm breaking TMDB API changes before refactoring

---

**Note**: This is a monolithic SPA frontend. Backend/auth is simulated. TMDB credentials required for development.
