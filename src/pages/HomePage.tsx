import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Hero } from '../components/Hero';
import { MediaRow } from '../components/MediaRow';
import { MediaSkeleton } from '../components/MediaSkeleton';
import { SearchAutocomplete } from '../components/SearchAutocomplete';
import type { MediaItem } from '../types/media';
import { getHomeCatalog } from '../services/tmdb';
import { getLibrary } from '../utils/library';
import { rankPersonalizedRecommendations } from '../utils/recommendations';

function entryToMedia(entry: ReturnType<typeof getLibrary>[number]): MediaItem {
  return {
    id: entry.id,
    title: entry.title,
    titleAr: entry.titleAr,
    description: '',
    descriptionAr: '',
    year: entry.year,
    rating: entry.rating,
    duration: '',
    genre: entry.genre || [],
    genreAr: entry.genreAr || [],
    genreIds: entry.genreIds || [],
    poster: entry.poster,
    backdrop: entry.backdrop,
    trailer: '',
    video: '',
    type: entry.type,
    tmdbType: entry.tmdbType,
  };
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<{ featured: MediaItem[]; movies: MediaItem[]; series: MediaItem[]; anime: MediaItem[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [continueWatching, setContinueWatching] = useState(() => getLibrary('continueWatching'));
  const currentLang = i18n.resolvedLanguage || localStorage.getItem('peakflix-language') || 'en';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getHomeCatalog()
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(reason.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [currentLang]);

  useEffect(() => {
    setContinueWatching(getLibrary('continueWatching'));
  }, []);

  const rows = useMemo(() => {
    const catalog = [...(data?.movies ?? []), ...(data?.series ?? []), ...(data?.anime ?? [])];
    return [
      {
        title: t('continueWatching'),
        items: continueWatching.map(entryToMedia),
        linkFor: (item: MediaItem) => `/watch/${item.id}`,
        labelFor: (item: MediaItem) => {
          const progress = continueWatching.find((entry) => entry.id === item.id);
          return progress?.season && progress?.episode ? `S${progress.season} · E${progress.episode}` : t('resume');
        },
      },
      { title: currentLang === 'ar' ? 'مختارات لك' : 'Recommended for you', items: rankPersonalizedRecommendations(catalog) },
      { title: t('trendingMovies'), items: data?.movies ?? [] },
      { title: t('trendingSeries'), items: data?.series ?? [] },
      { title: t('trendingAnime'), items: data?.anime ?? [] },
    ];
  }, [continueWatching, currentLang, data, t]);

  return (
    <>
      {data?.featured?.length ? <Hero items={data.featured} /> : <div className="hero hero-placeholder" />}
      <section className="home-search">
        <SearchAutocomplete className="home-search__form" placeholder={t('search')} buttonLabel={t('browse')} />
      </section>
      <div className="content-shell">
        {error ? <div className="error-banner">{error}</div> : null}
        {loading ? <MediaSkeleton count={6} /> : rows.map((row) => (
          <MediaRow key={row.title} title={row.title} items={row.items} linkFor={row.linkFor} labelFor={row.labelFor} />
        ))}
      </div>
    </>
  );
}
