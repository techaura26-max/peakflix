import { beforeEach, describe, expect, it } from 'vitest';
import type { MediaItem } from '../types/media';
import { createLibraryBackup, getLibrary, getWatchProgress, restoreLibraryBackup, saveWatchProgress, toggleEpisodeWatched, toggleLibraryEntry } from './library';

const item: MediaItem = {
  id: 'tv-1396', tmdbId: 1396, tmdbType: 'tv', type: 'series', title: 'Breaking Bad', titleAr: 'اختلال ضال',
  description: '', descriptionAr: '', year: 2008, rating: 9.5, duration: '', genre: ['Drama'], genreIds: [18], poster: '/poster.jpg', backdrop: '/backdrop.jpg', trailer: '', video: '',
};

describe('browser library', () => {
  beforeEach(() => localStorage.clear());

  it('saves and resumes the last series season and episode', () => {
    saveWatchProgress(item, 3, 7, 13);
    expect(getWatchProgress(item.id)).toMatchObject({ season: 3, episode: 7, totalEpisodes: 13 });
    expect(getLibrary('history')[0].id).toBe(item.id);
  });

  it('tracks watched episodes independently', () => {
    expect(toggleEpisodeWatched(item, 2, 4)).toBe(true);
    expect(toggleEpisodeWatched(item, 2, 4)).toBe(false);
  });

  it('exports and restores a validated backup', () => {
    toggleLibraryEntry('favorites', item);
    const backup = createLibraryBackup();
    localStorage.clear();
    restoreLibraryBackup(backup);
    expect(getLibrary('favorites')[0].title).toBe('Breaking Bad');
  });
});
