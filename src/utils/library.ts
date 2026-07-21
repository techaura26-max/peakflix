import type { LibraryEntry, MediaItem } from '../types/media';

const LIBRARY_KEYS = {
  continueWatching: 'cinevault-library-continue-watching',
  history: 'cinevault-library-history',
  favorites: 'cinevault-library-favorites',
  watchLater: 'cinevault-library-watch-later',
} as const;

type LibraryKind = keyof typeof LIBRARY_KEYS;

function readEntries(kind: LibraryKind): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEYS[kind]);
    return raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
  } catch {
    return [];
  }
}

function writeEntries(kind: LibraryKind, entries: LibraryEntry[]) {
  localStorage.setItem(LIBRARY_KEYS[kind], JSON.stringify(entries));
}

export function getLibrary(kind: LibraryKind): LibraryEntry[] {
  return readEntries(kind);
}

export function saveLibraryEntry(kind: LibraryKind, item: MediaItem) {
  const entries = readEntries(kind);
  const normalized: LibraryEntry = {
    id: item.id,
    title: item.title,
    titleAr: item.titleAr,
    poster: item.poster,
    backdrop: item.backdrop,
    rating: item.rating,
    year: item.year,
    type: item.type,
    tmdbType: item.tmdbType,
    watchedAt: Date.now(),
  };
  const next = [normalized, ...entries.filter((entry) => entry.id !== item.id)].slice(0, 12);
  writeEntries(kind, next);
  return next;
}

export function toggleLibraryEntry(kind: LibraryKind, item: MediaItem) {
  const entries = readEntries(kind);
  const existing = entries.find((entry) => entry.id === item.id);
  if (existing) {
    const next = entries.filter((entry) => entry.id !== item.id);
    writeEntries(kind, next);
    return false;
  }
  saveLibraryEntry(kind, item);
  return true;
}

export function removeLibraryEntry(kind: LibraryKind, id: string) {
  const entries = readEntries(kind).filter((entry) => entry.id !== id);
  writeEntries(kind, entries);
}
