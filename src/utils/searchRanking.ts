import type { MediaItem } from '../types/media';

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().normalize('NFKD');
}

function weightedRating(item: MediaItem) {
  const votes = Math.max(0, item.voteCount || 0);
  const average = Math.max(0, item.rating || 0);
  const minimumVotes = 120;
  const globalAverage = 6.2;
  return (votes / (votes + minimumVotes)) * average + (minimumVotes / (votes + minimumVotes)) * globalAverage;
}

export function searchSuggestionScore(item: MediaItem, query: string) {
  const term = normalize(query);
  const title = normalize(item.title);
  const originalTitle = normalize(item.originalTitle || '');
  const exactMatch = title === term || originalTitle === term;
  const prefixMatch = title.startsWith(term) || originalTitle.startsWith(term);
  const wordMatch = title.split(/\s+/).some((word) => word.startsWith(term));
  const exact = exactMatch ? 155 : 0;
  const prefix = !exactMatch && prefixMatch ? 120 : 0;
  const wordPrefix = !exactMatch && !prefixMatch && wordMatch ? 45 : 0;
  const popularity = Math.log10(Math.max(0, item.popularity || 0) + 1) * 34;
  const quality = weightedRating(item) * 9;
  const confidence = Math.log10(Math.max(0, item.voteCount || 0) + 1) * 8;
  const posterBonus = item.poster ? 8 : 0;
  return exact + prefix + wordPrefix + popularity + quality + confidence + posterBonus;
}

export function rankSearchSuggestions(items: MediaItem[], query: string, limit = 8) {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  return unique
    .map((item) => ({ item, score: searchSuggestionScore(item, query) }))
    .sort((a, b) => b.score - a.score || (b.item.voteCount || 0) - (a.item.voteCount || 0))
    .slice(0, limit)
    .map(({ item }) => item);
}
