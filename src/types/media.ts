export type MediaType = 'movie' | 'series' | 'anime' | 'turkish-series' | 'korean-drama';

export interface MediaPerson {
  id: number;
  name: string;
  role: string;
  photo: string;
}

export interface WatchProvider {
  id: number;
  name: string;
  logo: string;
}

export interface MediaSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path?: string | null;
}

export interface MediaEpisode {
  id: number;
  episode_number: number;
  name: string;
  still_path: string | null;
  overview: string;
  vote_average: number;
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
  genreIds?: number[];
  poster: string;
  backdrop: string;
  trailer: string;
  video: string;
  trending?: boolean;
  episodes?: number;
  seasons?: number;
  seasonList?: MediaSeason[];
  providers?: WatchProvider[];
  providerLink?: string;
  homepage?: string;
  status?: string;
  popularity?: number;
  voteCount?: number;
  originalLanguage?: string;
  originalTitle?: string;
  tagline?: string;
  runtimeMinutes?: number;
  certification?: string;
  trailerKey?: string;
  cast?: MediaPerson[];
  directors?: string[];
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
  genre?: string[];
  genreAr?: string[];
  genreIds?: number[];
  season?: number;
  episode?: number;
  totalEpisodes?: number;
  watchedEpisodes?: string[];
}
