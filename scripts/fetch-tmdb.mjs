import { writeFile, mkdir } from 'node:fs/promises';

const token = process.env.TMDB_READ_TOKEN?.trim();
if (!token) {
  throw new Error('TMDB_READ_TOKEN is missing. Add it under Settings > Secrets and variables > Actions using the exact name TMDB_READ_TOKEN.');
}

const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';
const headers = { Authorization: `Bearer ${token}`, accept: 'application/json' };

async function request(path, params = {}) {
  const url = new URL(`${API}${path}`);
  Object.entries(params).forEach(([key, value]) => value !== undefined && url.searchParams.set(key, String(value)));
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`TMDB ${response.status}: ${url.pathname} ${body.slice(0, 250)}`);
  }
  return response.json();
}

async function pages(path, params, count = 4) {
  const results = [];
  for (let page = 1; page <= count; page++) {
    const data = await request(path, { ...params, page });
    results.push(...(data.results || []));
  }
  return results;
}

console.log('TMDB token detected. Testing API access...');
await request('/configuration');
console.log('TMDB API access confirmed.');

const [movieGenresEn, movieGenresAr, tvGenresEn, tvGenresAr] = await Promise.all([
  request('/genre/movie/list', { language: 'en-US' }),
  request('/genre/movie/list', { language: 'ar' }),
  request('/genre/tv/list', { language: 'en-US' }),
  request('/genre/tv/list', { language: 'ar' })
]);

const maps = {
  movieEn: Object.fromEntries(movieGenresEn.genres.map(x => [x.id, x.name])),
  movieAr: Object.fromEntries(movieGenresAr.genres.map(x => [x.id, x.name])),
  tvEn: Object.fromEntries(tvGenresEn.genres.map(x => [x.id, x.name])),
  tvAr: Object.fromEntries(tvGenresAr.genres.map(x => [x.id, x.name]))
};
void maps;

const groups = await Promise.all([
  pages('/discover/movie', { language: 'en-US', include_adult: false, sort_by: 'popularity.desc', 'vote_count.gte': 100 }, 6).then(items => items.map(x => ({ ...x, siteType: 'movie', tmdbType: 'movie' }))),
  pages('/discover/tv', { language: 'en-US', include_adult: false, sort_by: 'popularity.desc', without_genres: 16, 'vote_count.gte': 50 }, 6).then(items => items.map(x => ({ ...x, siteType: 'series', tmdbType: 'tv' }))),
  pages('/discover/tv', { language: 'en-US', include_adult: false, sort_by: 'popularity.desc', with_genres: 16 }, 5).then(items => items.map(x => ({ ...x, siteType: 'anime', tmdbType: 'tv' }))),
  pages('/discover/tv', { language: 'en-US', include_adult: false, sort_by: 'popularity.desc', with_original_language: 'tr' }, 4).then(items => items.map(x => ({ ...x, siteType: 'turkish-series', tmdbType: 'tv' }))),
  pages('/discover/movie', { language: 'en-US', include_adult: false, sort_by: 'popularity.desc', with_original_language: 'tr' }, 3).then(items => items.map(x => ({ ...x, siteType: 'turkish-drama', tmdbType: 'movie' })))
]);

const unique = new Map();
for (const item of groups.flat()) unique.set(`${item.tmdbType}-${item.id}`, item);
const baseItems = [...unique.values()].filter(x => x.poster_path && x.backdrop_path);

async function enrich(item) {
  const [en, ar] = await Promise.all([
    request(`/${item.tmdbType}/${item.id}`, { language: 'en-US', append_to_response: 'watch/providers,videos' }),
    request(`/${item.tmdbType}/${item.id}`, { language: 'ar' })
  ]);
  const providerRegion = en['watch/providers']?.results?.JO || en['watch/providers']?.results?.US || null;
  const providerGroups = ['flatrate', 'free', 'ads', 'rent', 'buy'];
  const providers = [...new Map(providerGroups.flatMap(k => providerRegion?.[k] || []).map(p => [p.provider_id, {
    id: p.provider_id,
    name: p.provider_name,
    logo: p.logo_path ? `${IMG}/w92${p.logo_path}` : ''
  }])).values()];
  const trailer = en.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official) || en.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
  const runtime = item.tmdbType === 'movie' ? en.runtime : (en.episode_run_time?.[0] || null);
  const seasons = en.number_of_seasons || undefined;
  const episodes = en.number_of_episodes || undefined;
  const date = en.release_date || en.first_air_date || '';

  return {
    id: `${item.tmdbType}-${item.id}`,
    tmdbId: item.id,
    tmdbType: item.tmdbType,
    type: item.siteType,
    title: en.title || en.name || 'Untitled',
    titleAr: ar.title || ar.name || en.title || en.name || 'بدون عنوان',
    description: en.overview || 'No description available.',
    descriptionAr: ar.overview || en.overview || 'لا يوجد وصف متاح.',
    year: Number(date.slice(0, 4)) || 0,
    rating: Math.round((en.vote_average || 0) * 10) / 10,
    duration: runtime ? `${Math.floor(runtime / 60)}h ${String(runtime % 60).padStart(2, '0')}m` : seasons ? `${seasons} Seasons` : episodes ? `${episodes} Episodes` : 'N/A',
    genre: (en.genres || []).map(g => g.name),
    genreAr: (ar.genres || []).map(g => g.name),
    poster: `${IMG}/w500${en.poster_path}`,
    backdrop: `${IMG}/original${en.backdrop_path}`,
    trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
    video: '',
    trending: (en.popularity || 0) > 20,
    episodes,
    seasons,
    providers,
    providerLink: providerRegion?.link || `https://www.themoviedb.org/${item.tmdbType}/${item.id}/watch`,
    homepage: en.homepage || '',
    status: en.status || ''
  };
}

const catalog = [];
const concurrency = 6;
for (let i = 0; i < baseItems.length; i += concurrency) {
  const batch = baseItems.slice(i, i + concurrency);
  const enriched = await Promise.all(batch.map(async item => {
    try { return await enrich(item); }
    catch (error) { console.warn(`Skipping ${item.tmdbType}-${item.id}:`, error.message); return null; }
  }));
  catalog.push(...enriched.filter(Boolean));
  console.log(`Loaded ${Math.min(i + concurrency, baseItems.length)}/${baseItems.length}`);
}

if (catalog.length < 20) throw new Error(`TMDB returned only ${catalog.length} usable titles; deployment stopped to prevent publishing the old catalog.`);

await mkdir('src/data', { recursive: true });
const output = `import type { MediaItem } from '../types/media';\n\nexport const media: MediaItem[] = ${JSON.stringify(catalog, null, 2)};\n`;
await writeFile('src/data/media.ts', output, 'utf8');
console.log(`Generated ${catalog.length} TMDB titles.`);