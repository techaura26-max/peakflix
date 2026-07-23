import type { LibraryEntry, MediaItem, MediaType } from '../types/media';
import { getLibrary } from './library';

function uniqueCandidates(items: MediaItem[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

export function rankPersonalizedRecommendations(candidates: MediaItem[], limit = 12): MediaItem[] {
  const sources: Array<[LibraryEntry[], number]> = [
    [getLibrary('favorites'), 5],
    [getLibrary('continueWatching'), 3],
    [getLibrary('watchLater'), 2],
    [getLibrary('history'), 1],
  ];
  const typeWeights = new Map<MediaType, number>();
  const genreWeights = new Map<string, number>();
  const genreIdWeights = new Map<number, number>();
  const seen = new Set<string>();

  for (const [entries, weight] of sources) {
    for (const entry of entries) {
      seen.add(entry.id);
      typeWeights.set(entry.type, (typeWeights.get(entry.type) || 0) + weight);
      for (const genre of entry.genre || []) {
        const key = genre.toLocaleLowerCase();
        genreWeights.set(key, (genreWeights.get(key) || 0) + weight);
      }
      for (const genreId of entry.genreIds || []) {
        genreIdWeights.set(genreId, (genreIdWeights.get(genreId) || 0) + weight);
      }
    }
  }

  const scored = uniqueCandidates(candidates).map((item) => {
    const genreScore = item.genre.reduce((sum, genre) => sum + (genreWeights.get(genre.toLocaleLowerCase()) || 0), 0);
    const genreIdScore = (item.genreIds || []).reduce((sum, genreId) => sum + (genreIdWeights.get(genreId) || 0), 0);
    const typeScore = typeWeights.get(item.type) || 0;
    const qualityScore = item.rating * 1.8 + (item.trending ? 2 : 0);
    const discoveryBoost = seen.has(item.id) ? -30 : 4;
    return { item, score: qualityScore + genreScore * 2.2 + genreIdScore * 2.2 + typeScore * 1.4 + discoveryBoost };
  });

  const ranked = scored.sort((a, b) => b.score - a.score).map(({ item }) => item);
  const diverse: MediaItem[] = [];
  const typeCount = new Map<MediaType, number>();

  for (const item of ranked) {
    const count = typeCount.get(item.type) || 0;
    if (count >= Math.ceil(limit / 2) && ranked.length > limit) continue;
    diverse.push(item);
    typeCount.set(item.type, count + 1);
    if (diverse.length === limit) break;
  }

  return diverse;
}
