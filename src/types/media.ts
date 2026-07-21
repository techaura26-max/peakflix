export type MediaType = 'movie' | 'series' | 'anime' | 'turkish-series' | 'turkish-drama';

export interface WatchProvider {
  id: number;
  name: string;
  logo: string;
}

export interface MediaItem {
  id: string;
  tmdbId?: number;
  tmdbType?: 'movie' | 'tv';
  type: MediaType;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  year: number;
  rating: number;
  duration: string;
  genre: string[];
  genreAr?: string[];
  poster: string;
  backdrop: string;
  trailer: string;
  video: string;
  trending?: boolean;
  episodes?: number;
  seasons?: number;
  providers?: WatchProvider[];
  providerLink?: string;
  homepage?: string;
  status?: string;
}

export interface WatchProgress {
  mediaId: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface LibraryEntry {
  id: string;
  title: string;
  titleAr: string;
  poster: string;
  backdrop: string;
  rating: number;
  year: number;
  type: MediaType;
  tmdbType?: 'movie' | 'tv';
  watchedAt: number;
}
