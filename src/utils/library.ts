import type { LibraryEntry, MediaItem } from '../types/media';

const LIBRARY_KEYS = {
  continueWatching: 'peakflix-library-continue-watching-v2',
  history: 'peakflix-library-history-v2',
  favorites: 'peakflix-library-favorites-v2',
  watchLater: 'peakflix-library-watch-later-v2',
} as const;

const LEGACY_KEYS = {
  continueWatching: 'cinevault-library-continue-watching',
  history: 'cinevault-library-history',
  favorites: 'cinevault-library-favorites',
  watchLater: 'cinevault-library-watch-later',
} as const;

type LibraryKind = keyof typeof LIBRARY_KEYS;
const MAX_ENTRIES: Record<LibraryKind, number> = {
  continueWatching: 30,
  history: 50,
  favorites: 100,
  watchLater: 100,
};

function parseEntries(raw: string | null): LibraryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is LibraryEntry => (
      Boolean(entry) && typeof entry.id === 'string' && typeof entry.title === 'string'
    ));
  } catch {
    return [];
  }
}

function readEntries(kind: LibraryKind): LibraryEntry[] {
  const current = parseEntries(localStorage.getItem(LIBRARY_KEYS[kind]));
  if (current.length) return current;

  const legacy = parseEntries(localStorage.getItem(LEGACY_KEYS[kind]));
  if (legacy.length) writeEntries(kind, legacy);
  return legacy;
}

function writeEntries(kind: LibraryKind, entries: LibraryEntry[]) {
  const safeEntries = entries.slice(0, MAX_ENTRIES[kind]);
  try {
    localStorage.setItem(LIBRARY_KEYS[kind], JSON.stringify(safeEntries));
  } catch {
    try {
      localStorage.setItem(LIBRARY_KEYS[kind], JSON.stringify(safeEntries.slice(0, 12)));
    } catch {
      // Private browsing or a full storage quota must not break playback.
    }
  }
}

function toLibraryEntry(item: MediaItem, previous?: LibraryEntry): LibraryEntry {
  return {
    id: item.id,
    title: item.title,
    titleAr: item.titleAr,
    poster: item.poster,
    backdrop: item.backdrop,
    rating: item.rating,
    year: item.year,
    type: item.type,
    tmdbType: item.tmdbType,
    genre: item.genre,
    genreAr: item.genreAr,
    genreIds: item.genreIds,
    watchedAt: Date.now(),
    season: previous?.season,
    episode: previous?.episode,
    totalEpisodes: previous?.totalEpisodes,
  };
}

export function getLibrary(kind: LibraryKind): LibraryEntry[] {
  return readEntries(kind);
}

export function saveLibraryEntry(kind: LibraryKind, item: MediaItem) {
  const entries = readEntries(kind);
  const previous = entries.find((entry) => entry.id === item.id);
  const normalized = toLibraryEntry(item, previous);
  const next = [normalized, ...entries.filter((entry) => entry.id !== item.id)];
  writeEntries(kind, next);
  return next;
}

export function saveWatchProgress(item: MediaItem, season?: number, episode?: number, totalEpisodes?: number) {
  const entries = readEntries('continueWatching');
  const previous = entries.find((entry) => entry.id === item.id);
  const normalized = {
    ...toLibraryEntry(item, previous),
    season,
    episode,
    totalEpisodes,
  };
  const next = [normalized, ...entries.filter((entry) => entry.id !== item.id)];
  writeEntries('continueWatching', next);
  saveLibraryEntry('history', item);
  return normalized;
}

export function getWatchProgress(mediaId: string) {
  return readEntries('continueWatching').find((entry) => entry.id === mediaId);
}

export function toggleLibraryEntry(kind: LibraryKind, item: MediaItem) {
  const entries = readEntries(kind);
  const existing = entries.find((entry) => entry.id === item.id);
  if (existing) {
    writeEntries(kind, entries.filter((entry) => entry.id !== item.id));
    return false;
  }
  saveLibraryEntry(kind, item);
  return true;
}

export function removeLibraryEntry(kind: LibraryKind, id: string) {
  writeEntries(kind, readEntries(kind).filter((entry) => entry.id !== id));
}
