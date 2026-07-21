import type { MediaItem, MediaType } from '../types/media';

const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';
const token = import.meta.env.VITE_TMDB_READ_TOKEN as string | undefined;
const cache = new Map<string, { expiresAt: number; value: any }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

function authHeaders(): HeadersInit {
  if (!token) throw new Error('PeakFlix is currently unavailable. Please try again later.');
  return { Authorization: `Bearer ${token}`, accept: 'application/json' };
}

// دالة ذكية لتحديد لغة طلبات TMDB بناءً على اختيار المستخدم
function getCurrentLanguage(): string {
  const stored = localStorage.getItem('peakflix-language');
  const browserLang = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : '';
  const lang = stored || browserLang || 'en';
  // تحويل رموز اللغات إلى الشكل القياسي الذي تفضله TMDB
  const langMap: Record<string, string> = {
    ar: 'ar-SA',
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
    ja: 'ja-JP',
    it: 'it-IT',
    de: 'de-DE'
  };
  return langMap[lang] || 'en-US';
}

async function request(path: string, params: Record<string, string | number | boolean | undefined> = {}) {
  const url = new URL(`${API}${path}`);
  Object.entries(params).forEach(([key, value]) => value !== undefined && url.searchParams.set(key, String(value)));
  const cacheKey = `${path}?${url.searchParams.toString()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) throw new Error('PeakFlix could not load this content right now. Please try again later.');
  const data = await response.json();
  cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, value: data });
  return data;
}

function siteType(tmdbType: 'movie' | 'tv', raw: any, requested?: MediaType): MediaType {
  if (requested) return requested;
  if (tmdbType === 'movie') return raw.original_language === 'ko' ? 'turkish-drama' : 'movie';
  if ((raw.genre_ids || raw.genres?.map((g: any) => g.id) || []).includes(16)) return 'anime';
  if (raw.original_language === 'tr') return 'turkish-series';
  return 'series';
}

function mapBasic(raw: any, tmdbType: 'movie' | 'tv', requested?: MediaType): MediaItem {
  const date = raw.release_date || raw.first_air_date || '';
  return {
    id: `${tmdbType}-${raw.id}`,
    tmdbId: raw.id,
    tmdbType,
    type: siteType(tmdbType, raw, requested),
    title: raw.title || raw.name || 'Untitled',
    titleAr: raw.title || raw.name || 'بدون عنوان',
    description: raw.overview || 'No description available.',
    descriptionAr: raw.overview || 'لا يوجد وصف متاح.',
    year: Number(date.slice(0, 4)) || 0,
    rating: Math.round((raw.vote_average || 0) * 10) / 10,
    duration: '',
    genre: [],
    genreAr: [],
    poster: raw.poster_path ? `${IMG}/w500${raw.poster_path}` : '',
    backdrop: raw.backdrop_path ? `${IMG}/original${raw.backdrop_path}` : raw.poster_path ? `${IMG}/original${raw.poster_path}` : '',
    trailer: '',
    video: '',
    trending: true,
  };
}

export async function getHomeCatalog(): Promise<{ featured: MediaItem[]; movies: MediaItem[]; series: MediaItem[]; anime: MediaItem[] }> {
  const lang = getCurrentLanguage();
  const [allData, movieData, tvData, animeData] = await Promise.all([
    request('/trending/all/week', { language: lang }),
    request('/trending/movie/week', { language: lang }),
    request('/trending/tv/week', { language: lang }),
    request('/discover/tv', { language: lang, with_genres: 16, sort_by: 'popularity.desc', page: 1 }),
  ]);
  const featured = allData.results.filter((x: any) => x.poster_path).slice(0, 10).map((x: any) => mapBasic(x, x.media_type === 'tv' ? 'tv' : 'movie'));
  const movies = movieData.results.filter((x: any) => x.poster_path).map((x: any) => mapBasic(x, 'movie'));
  const series = tvData.results.filter((x: any) => x.poster_path).map((x: any) => mapBasic(x, 'tv'));
  const anime = animeData.results.filter((x: any) => x.poster_path).map((x: any) => mapBasic(x, 'tv', 'anime'));
  return { featured, movies, series, anime };
}

export async function getCategory(type: MediaType, page = 1): Promise<{ items: MediaItem[]; featured: MediaItem[]; totalPages: number }> {
  const lang = getCurrentLanguage();
  let path = '/discover/movie';
  const params: Record<string, string | number | boolean> = { language: lang, include_adult: false, sort_by: 'popularity.desc', page };
  let tmdbType: 'movie' | 'tv' = 'movie';
  if (type === 'series') { path = '/discover/tv'; tmdbType = 'tv'; params.without_genres = 16; }
  if (type === 'anime') { path = '/discover/tv'; tmdbType = 'tv'; params.with_genres = 16; }
  if (type === 'turkish-series') { path = '/discover/tv'; tmdbType = 'tv'; params.with_original_language = 'tr'; }
  if (type === 'turkish-drama') { path = '/discover/movie'; tmdbType = 'movie'; params.with_original_language = 'ko'; }
  const data = await request(path, params);
  const mapped = data.results.filter((x: any) => x.poster_path).map((x: any) => mapBasic(x, tmdbType, type));
  return {
    items: mapped,
    featured: mapped.slice(0, 10),
    totalPages: Math.min(data.total_pages || 1, 500),
  };
}

export async function searchTitles(query: string, page = 1): Promise<{ items: MediaItem[]; totalPages: number }> {
  const lang = getCurrentLanguage();
  const data = await request('/search/multi', { query, language: lang, include_adult: false, page });
  const results = data.results.filter((x: any) => (x.media_type === 'movie' || x.media_type === 'tv') && x.poster_path);
  return {
    items: results.map((x: any) => mapBasic(x, x.media_type)),
    totalPages: Math.min(data.total_pages || 1, 500),
  };
}

export async function getDetails(id: string): Promise<MediaItem> {
  const lang = getCurrentLanguage();
  const [tmdbType, rawId] = id.split('-') as ['movie' | 'tv', string];
  const [mainRes, arRes] = await Promise.all([
    request(`/${tmdbType}/${rawId}`, { language: lang, append_to_response: 'watch/providers,videos' }),
    request(`/${tmdbType}/${rawId}`, { language: 'ar' }),
  ]);
  const region = mainRes['watch/providers']?.results?.JO || mainRes['watch/providers']?.results?.US;
  const providerKinds = ['flatrate', 'free', 'ads', 'rent', 'buy'];
  const providers = [...new Map(providerKinds.flatMap(k => region?.[k] || []).map((p: any) => [p.provider_id, { id: p.provider_id, name: p.provider_name, logo: p.logo_path ? `${IMG}/w92${p.logo_path}` : '' }])).values()] as any[];
  const trailer = mainRes.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) || mainRes.videos?.results?.find((v: any) => v.site === 'YouTube' && v.type === 'Trailer');
  const runtime = tmdbType === 'movie' ? mainRes.runtime : mainRes.episode_run_time?.[0];
  const date = mainRes.release_date || mainRes.first_air_date || '';
  return {
    id: `${tmdbType}-${mainRes.id}`,
    tmdbId: mainRes.id,
    tmdbType,
    type: siteType(tmdbType, mainRes),
    title: mainRes.title || mainRes.name,
    titleAr: arRes.title || arRes.name || mainRes.title || mainRes.name,
    description: mainRes.overview || 'No description available.',
    descriptionAr: arRes.overview || mainRes.overview || 'لا يوجد وصف متاح.',
    year: Number(date.slice(0, 4)) || 0,
    rating: Math.round((mainRes.vote_average || 0) * 10) / 10,
    duration: runtime ? `${Math.floor(runtime / 60)}h ${String(runtime % 60).padStart(2, '0')}m` : mainRes.number_of_seasons ? `${mainRes.number_of_seasons} Seasons` : '',
    genre: (mainRes.genres || []).map((g: any) => g.name),
    genreAr: (arRes.genres || []).map((g: any) => g.name),
    poster: mainRes.poster_path ? `${IMG}/w500${mainRes.poster_path}` : '',
    backdrop: mainRes.backdrop_path ? `${IMG}/original${mainRes.backdrop_path}` : '',
    trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
    video: '',
    episodes: mainRes.number_of_episodes,
    seasons: mainRes.number_of_seasons,
    providers,
    providerLink: region?.link || `https://www.themoviedb.org/${tmdbType}/${mainRes.id}/watch`,
    homepage: mainRes.homepage || '',
    status: mainRes.status || '',
  };
}

export async function getRecommendations(id: string, tmdbType: 'movie' | 'tv'): Promise<MediaItem[]> {
  const lang = getCurrentLanguage();
  const [, rawId] = id.split('-') as ['movie' | 'tv', string];
  try {
    const [currentRes, recommendationsRes, similarRes] = await Promise.all([
      request(`/${tmdbType}/${rawId}`, { language: lang }),
      request(`/${tmdbType}/${rawId}/recommendations`, { language: lang, page: 1 }),
      request(`/${tmdbType}/${rawId}/similar`, { language: lang, page: 1 }),
    ]);

    const currentGenres = new Set<number>((currentRes.genres || []).map((g: any) => g.id));
    const currentLanguage = currentRes.original_language || '';
    const currentYear = (currentRes.release_date || currentRes.first_air_date || '').slice(0, 4);
    const recommendationIds = new Set<number>((recommendationsRes.results || []).map((x: any) => x.id));

    const scored = new Map<number, { item: any; score: number }>();

    for (const item of [...(recommendationsRes.results || []), ...(similarRes.results || [])]) {
      if (!item.poster_path) continue;
      const genreIds = new Set<number>((item.genre_ids || []).map((id: number) => id));
      const sharedGenres = [...currentGenres].filter((id) => genreIds.has(id)).length;
      const sameLanguage = item.original_language === currentLanguage;
      const itemYear = (item.release_date || item.first_air_date || '').slice(0, 4);
      const yearDiff = currentYear && itemYear ? Math.abs(Number(currentYear) - Number(itemYear)) : 0;
      const baseScore = recommendationIds.has(item.id) ? 6 : 2;
      const score = baseScore + sharedGenres * 2 + (sameLanguage ? 2 : 0) + (yearDiff <= 3 ? 1 : 0);

      const existing = scored.get(item.id);
      if (existing) {
        existing.score += score;
      } else {
        scored.set(item.id, { item, score });
      }
    }

    return [...scored.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ item }) => mapBasic(item, tmdbType));
  } catch {
    return [];
  }
}