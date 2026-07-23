import { Clock3, Search, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { MediaCard } from '../components/MediaCard';
import { ErrorState, LoadingState } from '../components/PageState';
import { SearchAutocomplete } from '../components/SearchAutocomplete';
import { Seo } from '../components/Seo';
import { getGenres, searchTitles } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import { clearRecentSearches, getRecentSearches, saveRecentSearch } from '../utils/searchHistory';
import { rankSearchSuggestions } from '../utils/searchRanking';
import { LANGUAGE_OPTIONS, normalizeLanguage } from '../i18n/languages';

const suggestionSeeds = ['Dune', 'Breaking Bad', 'One Piece', 'The Dark Knight', 'The Last of Us'];
type SortMode = 'relevant' | 'popular' | 'rating' | 'newest';

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [genres, setGenres] = useState<Array<{ id: number; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => getRecentSearches());
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [genreFilter, setGenreFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [minimumRating, setMinimumRating] = useState('0');
  const [sort, setSort] = useState<SortMode>('relevant');
  const term = params.get('q') || '';
  const currentLang = normalizeLanguage(i18n.resolvedLanguage);

  useEffect(() => {
    Promise.all([getGenres('movie'), getGenres('tv')])
      .then(([movieGenres, tvGenres]) => setGenres([...new Map([...movieGenres, ...tvGenres].map((genre) => [genre.id, genre])).values()].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => setGenres([]));
  }, [currentLang]);

  useEffect(() => {
    if (!term) { setItems([]); setLoading(false); return; }
    let active = true;
    setLoading(true);
    setError('');
    setPage(1);
    saveRecentSearch(term);
    setRecentSearches(getRecentSearches());
    searchTitles(term, 1)
      .then((result) => { if (active) { setItems(result.items); setTotalPages(result.totalPages); } })
      .catch((reason) => { if (active) setError(reason.message || t('offlineError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt, currentLang, t, term]);

  const filteredItems = useMemo(() => {
    const genreId = Number(genreFilter);
    const year = Number(yearFilter);
    const rating = Number(minimumRating);
    const filtered = items.filter((item) => (
      (typeFilter === 'all' || item.tmdbType === typeFilter)
      && (genreFilter === 'all' || item.genreIds?.includes(genreId))
      && (languageFilter === 'all' || item.originalLanguage === languageFilter)
      && (yearFilter === 'all' || item.year === year)
      && item.rating >= rating
    ));
    if (sort === 'relevant') return rankSearchSuggestions(filtered, term, filtered.length);
    return [...filtered].sort((a, b) => {
      if (sort === 'popular') return (b.popularity || 0) - (a.popularity || 0) || (b.voteCount || 0) - (a.voteCount || 0);
      if (sort === 'rating') return b.rating - a.rating || (b.voteCount || 0) - (a.voteCount || 0);
      return b.year - a.year || (b.popularity || 0) - (a.popularity || 0);
    });
  }, [genreFilter, items, languageFilter, minimumRating, sort, term, typeFilter, yearFilter]);

  const runSearch = (value: string) => {
    saveRecentSearch(value);
    setRecentSearches(getRecentSearches());
    setParams({ q: value });
  };

  const more = () => {
    const next = page + 1;
    setLoading(true);
    searchTitles(term, next)
      .then((result) => {
        setItems((current) => [...new Map([...current, ...result.items].map((item) => [item.id, item])).values()]);
        setPage(next);
        setTotalPages(result.totalPages);
      })
      .catch((reason) => setError(reason.message || t('offlineError')))
      .finally(() => setLoading(false));
  };

  const resetFilters = () => {
    setTypeFilter('all'); setGenreFilter('all'); setLanguageFilter('all'); setYearFilter('all'); setMinimumRating('0'); setSort('relevant');
  };

  return (
    <div className="page-shell search-page">
      <Seo title={term ? `${t('search')}: ${term}` : t('search')} />
      <SearchAutocomplete className="search-page__form" initialValue={term} autoFocus placeholder={t('search')} onSearch={runSearch} />

      {!term && !loading ? (
        <div className="search-rail">
          <div className="search-card"><div className="search-card-heading"><Sparkles size={18} /><h3>{t('suggestions')}</h3></div><div className="chip-list">{suggestionSeeds.map((value) => <button type="button" key={value} className="chip" onClick={() => runSearch(value)}>{value}</button>)}</div></div>
          <div className="search-card">
            <div className="search-card-heading"><Clock3 size={18} /><h3>{t('recentSearches')}</h3>{recentSearches.length ? <button type="button" className="icon-btn" aria-label={t('clear')} onClick={() => { clearRecentSearches(); setRecentSearches([]); }}><Trash2 size={16} /></button> : null}</div>
            {recentSearches.length ? <div className="chip-list">{recentSearches.map((value) => <button type="button" key={value} className="chip" onClick={() => runSearch(value)}>{value}</button>)}</div> : <p className="muted">{t('startTyping')}</p>}
          </div>
        </div>
      ) : null}

      {term ? (
        <section className="catalog-filters" aria-label={t('filters')}>
          <div className="filter-heading"><SlidersHorizontal size={18} /><strong>{t('filters')}</strong><button type="button" onClick={resetFilters}>{t('clearFilters')}</button></div>
          <label><span>{t('mediaType')}</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}><option value="all">{t('allTypes')}</option><option value="movie">{t('movie')}</option><option value="tv">{t('tvSeries')}</option></select></label>
          <label><span>{t('genre')}</span><select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}><option value="all">{t('allGenres')}</option>{genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}</select></label>
          <label><span>{t('originalLanguage')}</span><select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}><option value="all">{t('allLanguages')}</option>{LANGUAGE_OPTIONS.map(({ code }) => {
            const mediaCode = code === 'fil' ? 'tl' : code;
            return <option key={code} value={mediaCode}>{new Intl.DisplayNames([currentLang], { type: 'language' }).of(code) || code.toUpperCase()}</option>;
          })}</select></label>
          <label><span>{t('year')}</span><select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="all">{t('anyYear')}</option>{Array.from({ length: 77 }, (_, index) => new Date().getFullYear() - index).map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
          <label><span>{t('minimumRating')}</span><select value={minimumRating} onChange={(event) => setMinimumRating(event.target.value)}><option value="0">{t('anyRating')}</option>{[5, 6, 7, 8, 9].map((rating) => <option key={rating} value={rating}>{rating}+</option>)}</select></label>
          <label><span>{t('sortBy')}</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="relevant">{t('mostRelevant')}</option><option value="popular">{t('mostPopular')}</option><option value="rating">{t('highestRated')}</option><option value="newest">{t('newest')}</option></select></label>
        </section>
      ) : null}

      {error ? <ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /> : null}
      {loading && !items.length ? <LoadingState cards={10} /> : null}
      {filteredItems.length ? (
        <>
          <div className="catalog-results-heading"><h2>{t('resultsCount', { count: filteredItems.length })}</h2></div>
          <div className="catalog-grid">{filteredItems.map((item) => <MediaCard key={item.id} item={item} />)}</div>
          {loading ? <div className="load-status">{t('loading')}</div> : null}
          {!loading && page < totalPages ? <button type="button" className="load-more" onClick={more}>{t('loadMore')}</button> : null}
        </>
      ) : term && !loading && !error ? <div className="empty-state"><Search size={48} /><h2>{t('noResults')}</h2></div> : null}
    </div>
  );
}
