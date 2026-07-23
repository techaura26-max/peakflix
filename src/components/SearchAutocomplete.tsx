import { Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { searchTitleSuggestions } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import { saveRecentSearch } from '../utils/searchHistory';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';

interface SearchAutocompleteProps {
  className?: string;
  initialValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  buttonLabel?: string;
  onSearch?: (term: string) => void;
}

export function SearchAutocomplete({
  className = '',
  initialValue = '',
  placeholder = 'Search',
  autoFocus = false,
  buttonLabel,
  onSearch,
}: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { title } = useLocalizedMedia();
  const [query, setQuery] = useState(initialValue);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestId = useRef(0);
  const listId = useId();
  const language = i18n.resolvedLanguage || 'en';

  useEffect(() => setQuery(initialValue), [initialValue]);

  useEffect(() => {
    const term = query.trim();
    const currentRequest = ++requestId.current;
    setActiveIndex(-1);

    if (!term) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = window.setTimeout(() => {
      searchTitleSuggestions(term, 7)
        .then((results) => {
          if (requestId.current === currentRequest) setItems(results);
        })
        .catch(() => {
          if (requestId.current === currentRequest) setItems([]);
        })
        .finally(() => {
          if (requestId.current === currentRequest) setLoading(false);
        });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [query, language]);

  const runSearch = (term: string) => {
    const normalized = term.trim();
    if (!normalized) return;
    saveRecentSearch(normalized);
    setFocused(false);
    onSearch?.(normalized);
    if (!onSearch) navigate(`/search?q=${encodeURIComponent(normalized)}`);
  };

  const chooseItem = (item: MediaItem) => {
    saveRecentSearch(title(item));
    setQuery(title(item));
    setFocused(false);
    navigate(`/title/${item.id}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!focused || !items.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      chooseItem(items[activeIndex]);
    } else if (event.key === 'Escape') {
      setFocused(false);
    }
  };

  const open = focused && Boolean(query.trim());

  return (
    <form
      className={`${className} search-autocomplete`.trim()}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        runSearch(query);
      }}
    >
      <Search className="search-autocomplete__icon" size={17} aria-hidden="true" />
      <input
        autoFocus={autoFocus}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
      />
      {buttonLabel ? <button type="submit">{buttonLabel}</button> : null}

      {open ? (
        <div className="search-suggestions" id={listId} role="listbox">
          {items.map((item, index) => (
            <button
              id={`${listId}-${index}`}
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              className={index === activeIndex ? 'is-active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => chooseItem(item)}
            >
              {item.poster ? <img src={item.poster} alt="" /> : <span className="search-suggestions__poster" />}
              <span className="search-suggestions__copy">
                <strong>{title(item)}</strong>
                <small>{item.tmdbType === 'tv' ? 'Series' : 'Movie'}{item.year ? ` · ${item.year}` : ''}</small>
              </span>
              <span className="search-suggestions__rating">★ {item.rating || '—'}</span>
            </button>
          ))}
          {loading ? <div className="search-suggestions__status">Searching…</div> : null}
          {!loading && !items.length ? <div className="search-suggestions__status">No matching titles</div> : null}
        </div>
      ) : null}
    </form>
  );
}
