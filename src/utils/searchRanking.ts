import type { MediaItem } from '../types/media';

function normalize(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[right.length];
}

function fuzzyTitleScore(term: string, candidate: string) {
  if (term.length < 3 || !candidate) return 0;
  const values = [candidate, ...candidate.split(/\s+/)].filter((value) => value.length >= 3);
  return values.reduce((best, value) => {
    const distance = editDistance(term, value);
    const longest = Math.max(term.length, value.length);
    const similarity = 1 - distance / longest;
    if (distance <= 2 || similarity >= 0.72) return Math.max(best, 105 * similarity);
    return best;
  }, 0);
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
  const titles = [item.title, item.titleAr, item.localizedTitle || '', item.originalTitle || ''].map(normalize).filter(Boolean);
  const exactMatch = titles.some((title) => title === term);
  const prefixMatch = titles.some((title) => title.startsWith(term));
  const wordMatch = titles.some((title) => title.split(/\s+/).some((word) => word.startsWith(term)));
  const exact = exactMatch ? 155 : 0;
  const prefix = !exactMatch && prefixMatch ? 120 : 0;
  const wordPrefix = !exactMatch && !prefixMatch && wordMatch ? 45 : 0;
  const fuzzy = exactMatch || prefixMatch ? 0 : Math.max(0, ...titles.map((title) => fuzzyTitleScore(term, title)));
  const popularity = Math.log10(Math.max(0, item.popularity || 0) + 1) * 34;
  const quality = weightedRating(item) * 9;
  const confidence = Math.log10(Math.max(0, item.voteCount || 0) + 1) * 8;
  const posterBonus = item.poster ? 8 : 0;
  return exact + prefix + wordPrefix + fuzzy + popularity + quality + confidence + posterBonus;
}

export function rankSearchSuggestions(items: MediaItem[], query: string, limit = 8) {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  return unique
    .map((item) => ({ item, score: searchSuggestionScore(item, query) }))
    .sort((a, b) => b.score - a.score || (b.item.voteCount || 0) - (a.item.voteCount || 0))
    .slice(0, limit)
    .map(({ item }) => item);
}
