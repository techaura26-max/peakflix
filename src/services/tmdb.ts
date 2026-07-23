import type { MediaEpisode, MediaItem, MediaSeason, MediaType } from '../types/media';
import { rankSearchSuggestions } from '../utils/searchRanking';
import i18n from '../i18n';

const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';
const token = import.meta.env.VITE_TMDB_READ_TOKEN as string | undefined;
const MEMORY_CACHE = new Map<string, CacheEntry>();
const IN_FLIGHT = new Map<string, Promise<any>>();
const CACHE_PREFIX = 'peakflix-tmdb-v4:';
const MAX_BROWSER_ENTRIES = 45;
const STALE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  staleUntil: number;
  savedAt: number;
}

interface RequestOptions {
  ttl?: number;
  signal?: AbortSignal;
}

function authHeaders(): HeadersInit {
  if (!token) throw new Error('PeakFlix needs a TMDB token. Add VITE_TMDB_READ_TOKEN to your environment.');
  return { Authorization: `Bearer ${token}`, accept: 'application/json' };
}

function getCurrentLanguage(): string {
  const stored = localStorage.getItem('peakflix-language');
  const browserLang = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : '';
  const lang = stored || browserLang || 'en';
  const langMap: Record<string, string> = {
    ar: 'ar-SA', en: 'en-US', fr: 'fr-FR', es: 'es-ES', ja: 'ja-JP', it: 'it-IT', de: 'de-DE',
  };
  return langMap[lang] || 'en-US';
}

function cacheTtl(path: string) {
  if (path.startsWith('/search/')) return 5 * 60 * 1000;
  if (path.includes('/season/')) return 6 * 60 * 60 * 1000;
  if (path.includes('/recommendations') || path.includes('/similar')) return 30 * 60 * 1000;
  if (path.startsWith('/trending/')) return 15 * 60 * 1000;
  if (path.startsWith('/discover/')) return 30 * 60 * 1000;
  return 3 * 60 * 60 * 1000;
}

function readBrowserCache(key: string): CacheEntry | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${CACHE_PREFIX}${key}`) || 'null') as CacheEntry | null;
    if (!parsed || parsed.staleUntil <= Date.now()) {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
}

function trimBrowserCache(maxEntries = MAX_BROWSER_ENTRIES) {
  try {
    const entries: Array<{ key: string; savedAt: number }> = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(CACHE_PREFIX)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key) || 'null') as CacheEntry | null;
        entries.push({ key, savedAt: value?.savedAt || 0 });
      } catch {
        entries.push({ key, savedAt: 0 });
      }
    }
    entries.sort((a, b) => b.savedAt - a.savedAt).slice(maxEntries).forEach(({ key }) => localStorage.removeItem(key));
  } catch {
    // Caching is an optimization; storage failures should never break content loading.
  }
}

function saveCache(key: string, value: any, ttl: number) {
  const now = Date.now();
  const entry: CacheEntry = { value, savedAt: now, expiresAt: now + ttl, staleUntil: now + ttl + STALE_WINDOW_MS };
  MEMORY_CACHE.set(key, entry);
  try {
    localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    trimBrowserCache();
  } catch {
    try {
      trimBrowserCache(18);
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // Large TMDB payloads can exceed a browser quota; the memory cache remains available.
    }
  }
}

function cachedValue(key: string) {
  const entry = MEMORY_CACHE.get(key) || readBrowserCache(key);
  if (entry) MEMORY_CACHE.set(key, entry);
  return entry;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchWithRetry(url: URL, signal?: AbortSignal) {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { headers: authHeaders(), signal });
    lastStatus = response.status;
    if (response.ok) return response.json();

    if (response.status !== 429 && response.status < 500) break;
    const retryAfter = Number(response.headers.get('retry-after'));
    await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 350 * 2 ** attempt);
  }
  throw new Error(`${i18n.t('offlineError')}${lastStatus ? ` (${lastStatus})` : ''}`);
}

async function request(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options: RequestOptions = {},
) {
  const url = new URL(`${API}${path}`);
  Object.entries(params).forEach(([key, value]) => value !== undefined && url.searchParams.set(key, String(value)));
  const key = `${path}?${url.searchParams.toString()}`;
  const cached = cachedValue(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const load = async () => {
    try {
      const value = await fetchWithRetry(url, options.signal);
      saveCache(key, value, options.ttl ?? cacheTtl(path));
      return value;
    } catch (error) {
      if (cached && cached.staleUntil > Date.now() && !(error instanceof DOMException && error.name === 'AbortError')) {
        return cached.value;
      }
      throw error;
    }
  };

  if (options.signal) return load();
  const pending = IN_FLIGHT.get(key) || load();
  IN_FLIGHT.set(key, pending);
  try {
    return await pending;
  } finally {
    if (IN_FLIGHT.get(key) === pending) IN_FLIGHT.delete(key);
  }
}

function siteType(tmdbType: 'movie' | 'tv', raw: any, requested?: MediaType): MediaType {
  if (requested) return requested;
  if (tmdbType === 'movie') return 'movie';
  const genres = raw.genre_ids || raw.genres?.map((genre: any) => genre.id) || [];
  if (genres.includes(16)) return 'anime';
  if (raw.original_language === 'tr') return 'turkish-series';
  if (raw.original_language === 'ko') return 'korean-drama';
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
    description: raw.overview || i18n.t('noDescription'),
    descriptionAr: raw.overview || i18n.t('noDescription'),
    year: Number(date.slice(0, 4)) || 0,
    rating: Math.round((raw.vote_average || 0) * 10) / 10,
    duration: '',
    genre: (raw.genres || []).map((genre: any) => genre.name),
    genreAr: [],
    genreIds: raw.genre_ids || (raw.genres || []).map((genre: any) => genre.id),
    poster: raw.poster_path ? `${IMG}/w500${raw.poster_path}` : '',
    backdrop: raw.backdrop_path ? `${IMG}/w1280${raw.backdrop_path}` : raw.poster_path ? `${IMG}/w780${raw.poster_path}` : '',
    trailer: '',
    video: '',
    trending: true,
    popularity: raw.popularity || 0,
    voteCount: raw.vote_count || 0,
    originalLanguage: raw.original_language || '',
    originalTitle: raw.original_title || raw.original_name || '',
  };
}

export async function getHomeCatalog(): Promise<{ featured: MediaItem[]; movies: MediaItem[]; series: MediaItem[]; anime: MediaItem[] }> {
  const language = getCurrentLanguage();
  const [allData, movieData, tvData, animeData] = await Promise.all([
    request('/trending/all/week', { language }),
    request('/trending/movie/week', { language }),
    request('/trending/tv/week', { language }),
    request('/discover/tv', { language, include_adult: false, with_genres: 16, sort_by: 'popularity.desc', page: 1 }),
  ]);
  const featured = allData.results
    .filter((item: any) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
    .slice(0, 10)
    .map((item: any) => mapBasic(item, item.media_type));
  const movies = movieData.results.filter((item: any) => item.poster_path).map((item: any) => mapBasic(item, 'movie'));
  const series = tvData.results.filter((item: any) => item.poster_path).map((item: any) => mapBasic(item, 'tv'));
  const anime = animeData.results.filter((item: any) => item.poster_path).map((item: any) => mapBasic(item, 'tv', 'anime'));
  return { featured, movies, series, anime };
}

export async function getCategory(type: MediaType, page = 1): Promise<{ items: MediaItem[]; featured: MediaItem[]; totalPages: number }> {
  const language = getCurrentLanguage();
  let path = '/discover/movie';
  const params: Record<string, string | number | boolean> = { language, include_adult: false, sort_by: 'popularity.desc', page };
  let tmdbType: 'movie' | 'tv' = 'movie';
  if (type === 'series') { path = '/discover/tv'; tmdbType = 'tv'; params.without_genres = 16; }
  if (type === 'anime') { path = '/discover/tv'; tmdbType = 'tv'; params.with_genres = 16; }
  if (type === 'turkish-series') { path = '/discover/tv'; tmdbType = 'tv'; params.with_original_language = 'tr'; }
  if (type === 'korean-drama') { path = '/discover/tv'; tmdbType = 'tv'; params.with_original_language = 'ko'; }
  const data = await request(path, params);
  const mapped = data.results.filter((item: any) => item.poster_path).map((item: any) => mapBasic(item, tmdbType, type));
  return { items: mapped, featured: mapped.slice(0, 10), totalPages: Math.min(data.total_pages || 1, 500) };
}

export async function searchTitles(query: string, page = 1): Promise<{ items: MediaItem[]; totalPages: number }> {
  const data = await request('/search/multi', {
    query: query.trim(), language: getCurrentLanguage(), include_adult: false, page,
  });
  const results = data.results.filter((item: any) => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path);
  return { items: results.map((item: any) => mapBasic(item, item.media_type)), totalPages: Math.min(data.total_pages || 1, 500) };
}

export async function searchTitleSuggestions(query: string, limit = 7): Promise<MediaItem[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const [first, second] = await Promise.all([searchTitles(normalized, 1), searchTitles(normalized, 2)]);
  return rankSearchSuggestions([...first.items, ...second.items], normalized, limit);
}

export async function getDetails(id: string): Promise<MediaItem> {
  const [tmdbType, rawId] = id.split('-') as ['movie' | 'tv', string];
  if ((tmdbType !== 'movie' && tmdbType !== 'tv') || !/^\d+$/.test(rawId)) throw new Error(i18n.t('noResults'));
  const [main, arabic] = await Promise.all([
    request(`/${tmdbType}/${rawId}`, { language: getCurrentLanguage(), append_to_response: 'watch/providers,videos,credits,release_dates,content_ratings' }),
    request(`/${tmdbType}/${rawId}`, { language: 'ar' }),
  ]);
  const region = main['watch/providers']?.results?.JO || main['watch/providers']?.results?.US;
  const providerKinds = ['flatrate', 'free', 'ads', 'rent', 'buy'];
  const providers = [...new Map(providerKinds.flatMap((kind) => region?.[kind] || []).map((provider: any) => [provider.provider_id, {
    id: provider.provider_id, name: provider.provider_name, logo: provider.logo_path ? `${IMG}/w92${provider.logo_path}` : '',
  }])).values()] as any[];
  const trailer = main.videos?.results?.find((video: any) => video.site === 'YouTube' && video.type === 'Trailer' && video.official)
    || main.videos?.results?.find((video: any) => video.site === 'YouTube' && video.type === 'Trailer');
  const runtime = tmdbType === 'movie' ? main.runtime : main.episode_run_time?.[0];
  const date = main.release_date || main.first_air_date || '';
  const releaseRegion = main.release_dates?.results?.find((value: any) => value.iso_3166_1 === 'JO')
    || main.release_dates?.results?.find((value: any) => value.iso_3166_1 === 'US');
  const movieCertification = releaseRegion?.release_dates?.find((value: any) => value.certification)?.certification;
  const tvCertification = main.content_ratings?.results?.find((value: any) => value.iso_3166_1 === 'JO')?.rating
    || main.content_ratings?.results?.find((value: any) => value.iso_3166_1 === 'US')?.rating;
  const directorNames = tmdbType === 'movie'
    ? (main.credits?.crew || []).filter((person: any) => person.job === 'Director').map((person: any) => person.name)
    : (main.created_by || []).map((person: any) => person.name);
  return {
    ...mapBasic(main, tmdbType),
    titleAr: arabic.title || arabic.name || main.title || main.name,
    descriptionAr: arabic.overview || main.overview || 'لا يوجد وصف متاح.',
    year: Number(date.slice(0, 4)) || 0,
    duration: runtime ? `${Math.floor(runtime / 60)}h ${String(runtime % 60).padStart(2, '0')}m` : '',
    genre: (main.genres || []).map((genre: any) => genre.name),
    genreAr: (arabic.genres || []).map((genre: any) => genre.name),
    genreIds: (main.genres || []).map((genre: any) => genre.id),
    trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
    episodes: main.number_of_episodes,
    seasons: main.number_of_seasons,
    seasonList: (main.seasons || []).filter((season: MediaSeason) => season.season_number > 0),
    providers,
    providerLink: region?.link || `https://www.themoviedb.org/${tmdbType}/${main.id}/watch`,
    homepage: main.homepage || '',
    status: main.status || '',
    tagline: main.tagline || '',
    runtimeMinutes: runtime || undefined,
    certification: movieCertification || tvCertification || '',
    trailerKey: trailer?.key || '',
    cast: (main.credits?.cast || []).slice(0, 12).map((person: any) => ({
      id: person.id,
      name: person.name,
      role: person.character || person.known_for_department || '',
      photo: person.profile_path ? `${IMG}/w185${person.profile_path}` : '',
    })),
    directors: [...new Set<string>(directorNames)].slice(0, 4),
  };
}

export async function getGenres(tmdbType: 'movie' | 'tv') {
  const data = await request(`/genre/${tmdbType}/list`, { language: getCurrentLanguage() });
  return (data.genres || []) as Array<{ id: number; name: string }>;
}

export async function getSeasonEpisodes(tvId: number | string, season: number): Promise<MediaEpisode[]> {
  const language = getCurrentLanguage();
  const localized = await request(`/tv/${tvId}/season/${season}`, { language });
  if (localized.episodes?.length) return localized.episodes;
  const fallback = await request(`/tv/${tvId}/season/${season}`, { language: 'en-US' });
  return fallback.episodes || [];
}

export async function getRecommendations(id: string, tmdbType: 'movie' | 'tv'): Promise<MediaItem[]> {
  const language = getCurrentLanguage();
  const [, rawId] = id.split('-');
  try {
    const current = await request(`/${tmdbType}/${rawId}`, { language });
    const genreIds: number[] = (current.genres || []).map((genre: any) => genre.id);
    const discoverParams: Record<string, string | number | boolean> = {
      language,
      include_adult: false,
      sort_by: 'vote_average.desc',
      'vote_count.gte': tmdbType === 'movie' ? 120 : 60,
      page: 1,
    };
    if (genreIds.length) discoverParams.with_genres = genreIds.slice(0, 2).join(',');

    const [recommendationsOne, recommendationsTwo, similar, discovered] = await Promise.all([
      request(`/${tmdbType}/${rawId}/recommendations`, { language, page: 1 }),
      request(`/${tmdbType}/${rawId}/recommendations`, { language, page: 2 }),
      request(`/${tmdbType}/${rawId}/similar`, { language, page: 1 }),
      request(`/discover/${tmdbType}`, discoverParams),
    ]);

    const currentGenres = new Set<number>(genreIds);
    const currentYear = Number((current.release_date || current.first_air_date || '').slice(0, 4));
    const sourceGroups: Array<[any[], number]> = [
      [recommendationsOne.results || [], 18],
      [recommendationsTwo.results || [], 11],
      [similar.results || [], 8],
      [discovered.results || [], 4],
    ];
    const scored = new Map<number, { item: any; score: number }>();

    for (const [group, sourceWeight] of sourceGroups) {
      for (const candidate of group) {
        if (!candidate.poster_path || candidate.id === current.id) continue;
        const sharedGenres = (candidate.genre_ids || []).filter((genre: number) => currentGenres.has(genre)).length;
        const year = Number((candidate.release_date || candidate.first_air_date || '').slice(0, 4));
        const yearDistance = currentYear && year ? Math.abs(currentYear - year) : 20;
        const quality = (candidate.vote_average || 0) * 1.3 + Math.log10((candidate.vote_count || 0) + 1) * 2;
        const languageMatch = candidate.original_language === current.original_language ? 3 : 0;
        const completeness = candidate.backdrop_path && candidate.overview ? 2 : 0;
        const score = sourceWeight + sharedGenres * 7 + quality + languageMatch + completeness + Math.max(0, 4 - yearDistance * 0.25);
        const existing = scored.get(candidate.id);
        if (existing) existing.score += sourceWeight * 0.45 + sharedGenres * 2;
        else scored.set(candidate.id, { item: candidate, score });
      }
    }

    return [...scored.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ item }) => mapBasic(item, tmdbType));
  } catch {
    return [];
  }
}
