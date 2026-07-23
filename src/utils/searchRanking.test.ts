import { describe, expect, it } from 'vitest';
import type { MediaItem } from '../types/media';
import { rankSearchSuggestions } from './searchRanking';

function media(overrides: Partial<MediaItem>): MediaItem {
  return {
    id: 'movie-1', type: 'movie', tmdbType: 'movie', title: 'Untitled', titleAr: 'بدون عنوان', description: '', descriptionAr: '',
    year: 2024, rating: 7, duration: '', genre: [], genreIds: [], poster: '/poster.jpg', backdrop: '', trailer: '', video: '',
    ...overrides,
  };
}

describe('rankSearchSuggestions', () => {
  it('puts an exact, popular and well-supported match above obscure matches', () => {
    const results = rankSearchSuggestions([
      media({ id: 'movie-2', title: 'Dune Warriors', rating: 9.5, popularity: 2, voteCount: 3 }),
      media({ id: 'movie-1', title: 'Dune', rating: 8.1, popularity: 220, voteCount: 12000 }),
      media({ id: 'tv-3', tmdbType: 'tv', type: 'series', title: 'Beyond Dune', rating: 7.9, popularity: 40, voteCount: 800 }),
    ], 'Dune');
    expect(results[0].title).toBe('Dune');
  });

  it('removes duplicate TMDB results', () => {
    const duplicate = media({ id: 'movie-1', title: 'Dune', popularity: 100 });
    expect(rankSearchSuggestions([duplicate, duplicate], 'Dune')).toHaveLength(1);
  });

  it('lets a highly popular sequel outrank an obscure exact-title result', () => {
    const results = rankSearchSuggestions([
      media({ id: 'movie-obscure', title: 'Dune', rating: 7.4, popularity: 2, voteCount: 15 }),
      media({ id: 'movie-sequel', title: 'Dune: Part Two', rating: 8.1, popularity: 240, voteCount: 9500 }),
    ], 'Dune');
    expect(results[0].title).toBe('Dune: Part Two');
  });
});
