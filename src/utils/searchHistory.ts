const SEARCH_HISTORY_KEY = 'peakflix-search-history-v1';
const MAX_SEARCHES = 8;

export function getRecentSearches(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string').slice(0, MAX_SEARCHES) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(term: string) {
  const normalized = term.trim();
  if (!normalized) return;

  const next = [
    normalized,
    ...getRecentSearches().filter((value) => value.toLocaleLowerCase() !== normalized.toLocaleLowerCase()),
  ].slice(0, MAX_SEARCHES);

  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Search history is optional; the website still works if browser storage is unavailable.
  }
}
