import type { LibraryEntry, MediaItem, PlaybackPosition } from '../types/media';

const LIBRARY_KEYS = {
  continueWatching: 'peakflix-library-continue-watching-v2',
  history: 'peakflix-library-history-v2',
  favorites: 'peakflix-library-favorites-v2',
  watchLater: 'peakflix-library-watch-later-v2',
  watched: 'peakflix-library-watched-v2',
} as const;

const LEGACY_KEYS = {
  continueWatching: 'cinevault-library-continue-watching',
  history: 'cinevault-library-history',
  favorites: 'cinevault-library-favorites',
  watchLater: 'cinevault-library-watch-later',
  watched: 'cinevault-library-watched',
} as const;

export type LibraryKind = keyof typeof LIBRARY_KEYS;
const MAX_ENTRIES: Record<LibraryKind, number> = {
  continueWatching: 30,
  history: 50,
  favorites: 100,
  watchLater: 100,
  watched: 150,
};

export interface LibraryBackup {
  app: 'PeakFlix';
  version: 1;
  exportedAt: string;
  libraries: Record<LibraryKind, LibraryEntry[]>;
}

function notifyLibraryChanged() {
  window.dispatchEvent(new CustomEvent('peakflix-library-change'));
}

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
    watchedEpisodes: previous?.watchedEpisodes,
    playback: previous?.playback,
    episodePlayback: previous?.episodePlayback,
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
  notifyLibraryChanged();
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
  notifyLibraryChanged();
  return normalized;
}

export function getWatchProgress(mediaId: string) {
  return readEntries('continueWatching').find((entry) => entry.id === mediaId);
}

function playbackKey(season: number, episode: number) {
  return `${season}:${episode}`;
}

function normalizedPlayback(currentTime: number, duration: number): PlaybackPosition | undefined {
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || currentTime < 0 || duration <= 0) return undefined;
  return {
    currentTime: Math.min(currentTime, duration),
    duration,
    updatedAt: Date.now(),
  };
}

export function savePlaybackPosition(
  item: MediaItem,
  currentTime: number,
  duration: number,
  season?: number,
  episode?: number,
  totalEpisodes?: number,
) {
  const playback = normalizedPlayback(currentTime, duration);
  if (!playback) return getWatchProgress(item.id);

  const entries = readEntries('continueWatching');
  const previous = entries.find((entry) => entry.id === item.id);
  const isEpisode = season !== undefined && episode !== undefined;
  const episodePlayback = { ...(previous?.episodePlayback || {}) };
  if (isEpisode) episodePlayback[playbackKey(season, episode)] = playback;

  const normalized: LibraryEntry = {
    ...toLibraryEntry(item, previous),
    season: isEpisode ? season : previous?.season,
    episode: isEpisode ? episode : previous?.episode,
    totalEpisodes: totalEpisodes ?? previous?.totalEpisodes,
    playback: isEpisode ? previous?.playback : playback,
    episodePlayback,
  };
  writeEntries('continueWatching', [normalized, ...entries.filter((entry) => entry.id !== item.id)]);
  notifyLibraryChanged();
  return normalized;
}

export function getPlaybackPosition(mediaId: string, season?: number, episode?: number) {
  const entry = getWatchProgress(mediaId);
  if (!entry) return undefined;
  if (season !== undefined && episode !== undefined) {
    return entry.episodePlayback?.[playbackKey(season, episode)];
  }
  return entry.playback;
}

export function getCardProgress(mediaId: string) {
  const entry = getWatchProgress(mediaId);
  if (!entry) return undefined;

  if (entry.season !== undefined && entry.episode !== undefined) {
    const episodePosition = entry.episodePlayback?.[playbackKey(entry.season, entry.episode)];
    const episodeFraction = episodePosition?.duration
      ? Math.min(1, Math.max(0, episodePosition.currentTime / episodePosition.duration))
      : 0;
    const total = Math.max(entry.totalEpisodes || entry.episode, 1);
    return Math.min(100, Math.max(1, ((entry.episode - 1 + episodeFraction) / total) * 100));
  }

  if (entry.playback?.duration) {
    return Math.min(100, Math.max(1, (entry.playback.currentTime / entry.playback.duration) * 100));
  }
  return 1;
}

export function toggleLibraryEntry(kind: LibraryKind, item: MediaItem) {
  const entries = readEntries(kind);
  const existing = entries.find((entry) => entry.id === item.id);
  if (existing) {
    writeEntries(kind, entries.filter((entry) => entry.id !== item.id));
    notifyLibraryChanged();
    return false;
  }
  saveLibraryEntry(kind, item);
  return true;
}

export function removeLibraryEntry(kind: LibraryKind, id: string) {
  writeEntries(kind, readEntries(kind).filter((entry) => entry.id !== id));
  notifyLibraryChanged();
}

export function clearLibrary(kind: LibraryKind) {
  writeEntries(kind, []);
  notifyLibraryChanged();
}

export function isInLibrary(kind: LibraryKind, id: string) {
  return readEntries(kind).some((entry) => entry.id === id);
}

function episodeKey(season: number, episode: number) {
  return `${season}:${episode}`;
}

export function isEpisodeWatched(mediaId: string, season: number, episode: number) {
  const entry = readEntries('continueWatching').find((value) => value.id === mediaId)
    || readEntries('history').find((value) => value.id === mediaId);
  return entry?.watchedEpisodes?.includes(episodeKey(season, episode)) || false;
}

export function toggleEpisodeWatched(item: MediaItem, season: number, episode: number) {
  const key = episodeKey(season, episode);
  const entries = readEntries('continueWatching');
  const previous = entries.find((entry) => entry.id === item.id);
  const watchedEpisodes = new Set(previous?.watchedEpisodes || []);
  if (watchedEpisodes.has(key)) watchedEpisodes.delete(key);
  else watchedEpisodes.add(key);
  const normalized: LibraryEntry = {
    ...toLibraryEntry(item, previous),
    season: previous?.season || season,
    episode: previous?.episode || episode,
    totalEpisodes: previous?.totalEpisodes,
    watchedEpisodes: [...watchedEpisodes],
  };
  writeEntries('continueWatching', [normalized, ...entries.filter((entry) => entry.id !== item.id)]);
  notifyLibraryChanged();
  return watchedEpisodes.has(key);
}

export function createLibraryBackup(): LibraryBackup {
  return {
    app: 'PeakFlix',
    version: 1,
    exportedAt: new Date().toISOString(),
    libraries: {
      continueWatching: readEntries('continueWatching'),
      history: readEntries('history'),
      favorites: readEntries('favorites'),
      watchLater: readEntries('watchLater'),
      watched: readEntries('watched'),
    },
  };
}

export function restoreLibraryBackup(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Invalid PeakFlix backup.');
  const backup = value as Partial<LibraryBackup>;
  if (backup.app !== 'PeakFlix' || backup.version !== 1 || !backup.libraries) {
    throw new Error('This file is not a supported PeakFlix backup.');
  }
  (Object.keys(LIBRARY_KEYS) as LibraryKind[]).forEach((kind) => {
    const imported = Array.isArray(backup.libraries?.[kind]) ? backup.libraries[kind] : [];
    const valid = imported.filter((entry): entry is LibraryEntry => (
      Boolean(entry) && typeof entry.id === 'string' && typeof entry.title === 'string'
    ));
    const merged = [...valid, ...readEntries(kind)];
    writeEntries(kind, [...new Map(merged.map((entry) => [entry.id, entry])).values()]);
  });
  notifyLibraryChanged();
}
