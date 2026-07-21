import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { MediaRow } from '../components/MediaRow';
import { MediaSkeleton } from '../components/MediaSkeleton';
import type { MediaItem } from '../types/media';
import { getHomeCatalog } from '../services/tmdb';
import { getLibrary } from '../utils/library';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ featured: MediaItem[]; movies: MediaItem[]; series: MediaItem[]; anime: MediaItem[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [continueWatching, setContinueWatching] = useState<MediaItem[]>([]);
  const currentLang = i18n.resolvedLanguage || localStorage.getItem('peakflix-language') || 'en';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getHomeCatalog()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentLang]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  useEffect(() => {
    setContinueWatching(getLibrary('continueWatching').map((entry) => ({
      id: entry.id,
      title: entry.title,
      titleAr: entry.titleAr,
      description: '',
      descriptionAr: '',
      year: entry.year,
      rating: entry.rating,
      duration: '',
      genre: [],
      genreAr: [],
      poster: entry.poster,
      backdrop: entry.backdrop,
      trailer: '',
      video: '',
      type: entry.type,
      tmdbType: entry.tmdbType,
    })));
  }, []);

  const rows = useMemo(
    () => [
      { title: t('continueWatching'), items: continueWatching },
      { title: t('trendingMovies'), items: data?.movies ?? [] },
      { title: t('trendingSeries'), items: data?.series ?? [] },
      { title: t('trendingAnime'), items: data?.anime ?? [] },
    ],
    [continueWatching, data, t],
  );

  if (error) {
    return (
      <div className="page-shell">
        <div className="empty-state">
          <h2>{error}</h2>
        </div>
      </div>
    );
  }

  return (
    <>
      {data?.featured?.length ? <Hero items={data.featured} /> : <div className="hero hero-placeholder" />}
      <section className="home-search">
        <form onSubmit={submit}>
          <Search />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} />
          <button>{t('browse')}</button>
        </form>
      </section>
      <div className="content-shell">
        {error ? <div className="error-banner">{error}</div> : null}
        {loading ? <MediaSkeleton count={6} /> : rows.map((row) => <MediaRow key={row.title} title={row.title} items={row.items} />)}
      </div>
    </>
  );
}