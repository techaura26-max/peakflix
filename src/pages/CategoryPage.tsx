import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { MediaCard } from '../components/MediaCard';
import { ErrorState, LoadingState } from '../components/PageState';
import { Seo } from '../components/Seo';
import { getCategory } from '../services/tmdb';
import type { MediaItem, MediaType } from '../types/media';

const categoryKeys: Record<MediaType, string> = {
  movie: 'movies', series: 'series', anime: 'anime', 'turkish-series': 'turkishSeries', 'korean-drama': 'koreanDrama',
};

export function CategoryPage() {
  const { type } = useParams();
  const { t, i18n } = useTranslation();
  const category = (type || 'movie') as MediaType;
  const [items, setItems] = useState<MediaItem[]>([]);
  const [featured, setFeatured] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [sort, setSort] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [minimumRating, setMinimumRating] = useState('0');
  const language = i18n.resolvedLanguage || 'en';
  const label = t(categoryKeys[category] || 'movies');

  useEffect(() => {
    let active = true;
    setItems([]); setFeatured([]); setPage(1); setLoading(true); setError('');
    getCategory(category, 1)
      .then((result) => { if (active) { setItems(result.items); setFeatured(result.featured); setTotalPages(result.totalPages); } })
      .catch((reason) => { if (active) setError(reason.message || t('offlineError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, category, language, t]);

  const visibleItems = useMemo(() => [...items]
    .filter((item) => item.rating >= Number(minimumRating))
    .sort((a, b) => sort === 'rating' ? b.rating - a.rating || (b.voteCount || 0) - (a.voteCount || 0) : sort === 'newest' ? b.year - a.year : (b.popularity || 0) - (a.popularity || 0)), [items, minimumRating, sort]);

  const more = () => {
    const next = page + 1; setLoading(true);
    getCategory(category, next)
      .then((result) => { setItems((current) => [...new Map([...current, ...result.items].map((item) => [item.id, item])).values()]); setPage(next); setTotalPages(result.totalPages); })
      .catch((reason) => setError(reason.message || t('offlineError')))
      .finally(() => setLoading(false));
  };

  return (
    <div className="page-shell">
      <Seo title={label} description={`${t('explore')} · ${label}`} />
      <div className="page-banner"><span>{t('explore')}</span><h1>{label}</h1></div>
      {featured.length ? <Hero items={featured} compact /> : null}
      <div className="category-tools">
        <label><span>{t('minimumRating')}</span><select value={minimumRating} onChange={(event) => setMinimumRating(event.target.value)}><option value="0">{t('anyRating')}</option>{[5, 6, 7, 8, 9].map((rating) => <option key={rating} value={rating}>{rating}+</option>)}</select></label>
        <label><span>{t('sortBy')}</span><select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="popular">{t('mostPopular')}</option><option value="rating">{t('highestRated')}</option><option value="newest">{t('newest')}</option></select></label>
      </div>
      {error ? <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {loading && !items.length ? <LoadingState cards={10} /> : <div className="catalog-grid">{visibleItems.map((item) => <MediaCard key={item.id} item={item} />)}</div>}
      {loading && items.length ? <div className="load-status">{t('loading')}</div> : null}
      {!loading && page < totalPages ? <button type="button" className="load-more" onClick={more}>{t('loadMore')}</button> : null}
    </div>
  );
}
