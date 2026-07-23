import { Clock3, Search, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { MediaCard } from '../components/MediaCard';
import { SearchAutocomplete } from '../components/SearchAutocomplete';
import type { MediaItem } from '../types/media';
import { searchTitles } from '../services/tmdb';
import { getRecentSearches, saveRecentSearch } from '../utils/searchHistory';

const suggestionSeeds = ['Dune', 'Breaking Bad', 'One Piece', 'The Dark Knight', 'The Last of Us'];

export function SearchPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recentSearches, setRecentSearches] = useState(() => getRecentSearches());
  const term = params.get('q') || '';
  const currentLang = i18n.resolvedLanguage || localStorage.getItem('peakflix-language') || 'en';
  const ar = currentLang === 'ar';

  useEffect(() => {
    if (!term) {
      setItems([]);
      return;
    }

    let active = true;
    setLoading(true);
    setError('');
    setPage(1);
    saveRecentSearch(term);
    setRecentSearches(getRecentSearches());

    searchTitles(term, 1)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setTotalPages(result.totalPages);
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [term, currentLang]);

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
        setItems((current) => {
          const unique = new Map([...current, ...result.items].map((item) => [item.id, item]));
          return [...unique.values()];
        });
        setPage(next);
        setTotalPages(result.totalPages);
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="page-shell search-page">
      <SearchAutocomplete
        className="search-page__form"
        initialValue={term}
        autoFocus
        placeholder={t('search')}
        onSearch={runSearch}
      />

      {!term && !loading ? (
        <div className="search-rail">
          <div className="search-card">
            <div className="search-card-heading"><Sparkles size={18} /><h3>{ar ? 'اقتراحات' : 'Suggestions'}</h3></div>
            <div className="chip-list">
              {suggestionSeeds.map((value) => <button key={value} className="chip" onClick={() => runSearch(value)}>{value}</button>)}
            </div>
          </div>
          <div className="search-card">
            <div className="search-card-heading"><Clock3 size={18} /><h3>{ar ? 'عمليات البحث الأخيرة' : 'Recent searches'}</h3></div>
            {recentSearches.length ? (
              <div className="chip-list">
                {recentSearches.map((value) => <button key={value} className="chip" onClick={() => runSearch(value)}>{value}</button>)}
              </div>
            ) : <p className="muted">{ar ? 'ابدأ بالكتابة للعثور على أفلام ومسلسلات وأنمي.' : 'Start typing to discover movies, series, and anime.'}</p>}
          </div>
        </div>
      ) : null}

      {error ? <div className="error-banner">{error}</div> : null}
      {items.length ? (
        <>
          <div className="catalog-grid">{items.map((item) => <MediaCard key={item.id} item={item} />)}</div>
          {loading ? <div className="load-status">{ar ? 'جاري التحميل…' : 'Loading…'}</div> : null}
          {!loading && page < totalPages ? <button className="load-more" onClick={more}>{ar ? 'عرض المزيد' : 'Load more'}</button> : null}
        </>
      ) : term && !loading && !error ? (
        <div className="empty-state"><Search size={48} /><h2>{t('noResults')}</h2></div>
      ) : null}
    </div>
  );
}
