import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function response(results: any[]) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: async () => ({ results, total_pages: results.length ? 1 : 0 }),
  };
}

describe('multilingual resilient TMDB search', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('peakflix-language', 'en');
    vi.resetModules();
    vi.stubEnv('VITE_TMDB_READ_TOKEN', 'test-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('merges Arabic and English titles for the same result', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: URL) => {
      const language = input.searchParams.get('language');
      return response([{
        id: 438631,
        media_type: 'movie',
        title: language === 'ar-SA' ? 'كثيب' : 'Dune',
        overview: language === 'ar-SA' ? 'وصف عربي' : 'English description',
        poster_path: '/dune.jpg',
        release_date: '2021-09-15',
        vote_average: 7.8,
        vote_count: 12000,
        popularity: 200,
      }]);
    }));
    const { searchTitles } = await import('./tmdb');
    const result = await searchTitles('كثيب');
    expect(result.items[0]).toMatchObject({ title: 'Dune', titleAr: 'كثيب' });
  });

  it('rescues a misspelled query using a searchable word and fuzzy ranking', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: URL) => {
      const query = input.searchParams.get('query');
      if (query !== 'Bad') return response([]);
      const language = input.searchParams.get('language');
      return response([
        {
          id: 1396,
          media_type: 'tv',
          name: language === 'ar-SA' ? 'اختلال ضال' : 'Breaking Bad',
          poster_path: '/breaking-bad.jpg',
          first_air_date: '2008-01-20',
          vote_average: 9.5,
          vote_count: 16000,
          popularity: 180,
        },
        {
          id: 9737,
          media_type: 'movie',
          title: language === 'ar-SA' ? 'فتيان أشقياء' : 'Bad Boys',
          poster_path: '/bad-boys.jpg',
          release_date: '1995-04-07',
          vote_average: 6.8,
          vote_count: 6000,
          popularity: 190,
        },
      ]);
    }));
    const { searchTitles } = await import('./tmdb');
    const result = await searchTitles('Breking Bad');
    expect(result.items[0].title).toBe('Breaking Bad');
  });
});
