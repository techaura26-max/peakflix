import type { LibraryEntry, MediaItem, MediaType } from '../types/media';
import { getLibrary } from './library';

function uniqueCandidates(items: MediaItem[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function rankPersonalizedRecommendations(candidates: MediaItem[], limit = 12): MediaItem[] {
  const sources: Array<[LibraryEntry[], number]> = [
    [getLibrary('favorites'), 7],
    [getLibrary('watchLater'), 5],
    [getLibrary('continueWatching'), 4],
    [getLibrary('history'), 2],
    [getLibrary('watched'), 1],
  ];
  const typeWeights = new Map<MediaType, number>();
  const genreWeights = new Map<string, number>();
  const genreIdWeights = new Map<number, number>();
  const seen = new Map<string, number>();

  for (const [entries, weight] of sources) {
    for (const entry of entries) {
      const ageDays = Math.max(0, (Date.now() - (entry.watchedAt || Date.now())) / 86_400_000);
      const recency = Math.max(0.35, Math.exp(-ageDays / 120));
      const effectiveWeight = weight * recency;
      seen.set(entry.id, Math.max(seen.get(entry.id) || 0, weight));
      typeWeights.set(entry.type, (typeWeights.get(entry.type) || 0) + effectiveWeight);
      for (const genre of entry.genre || []) {
        const key = genre.toLocaleLowerCase();
        genreWeights.set(key, (genreWeights.get(key) || 0) + effectiveWeight);
      }
      for (const genreId of entry.genreIds || []) {
        genreIdWeights.set(genreId, (genreIdWeights.get(genreId) || 0) + effectiveWeight);
      }
    }
  }

  const scored = uniqueCandidates(candidates).map((item) => {
    const genreScore = item.genre.reduce((sum, genre) => sum + (genreWeights.get(genre.toLocaleLowerCase()) || 0), 0);
    const genreIdScore = (item.genreIds || []).reduce((sum, genreId) => sum + (genreIdWeights.get(genreId) || 0), 0);
    const typeScore = typeWeights.get(item.type) || 0;
    const qualityScore = item.rating * 2.2
      + Math.log10((item.voteCount || 0) + 1) * 2.4
      + Math.log10((item.popularity || 0) + 1) * 2
      + (item.trending ? 2 : 0);
    const discoveryBoost = seen.has(item.id) ? -45 - (seen.get(item.id) || 0) * 4 : 6;
    return { item, score: qualityScore + genreScore * 2.5 + genreIdScore * 2.8 + typeScore * 1.2 + discoveryBoost };
  });

  const ranked = scored.sort((a, b) => b.score - a.score).map(({ item }) => item);
  const diverse: MediaItem[] = [];
  const typeCount = new Map<MediaType, number>();
  const leadGenreCount = new Map<number, number>();

  for (const item of ranked) {
    const count = typeCount.get(item.type) || 0;
    if (count >= Math.ceil(limit / 2) && ranked.length > limit) continue;
    const leadGenre = item.genreIds?.[0];
    if (leadGenre && (leadGenreCount.get(leadGenre) || 0) >= Math.ceil(limit / 3) && ranked.length > limit) continue;
    diverse.push(item);
    typeCount.set(item.type, count + 1);
    if (leadGenre) leadGenreCount.set(leadGenre, (leadGenreCount.get(leadGenre) || 0) + 1);
    if (diverse.length === limit) break;
  }

  return diverse;
}
