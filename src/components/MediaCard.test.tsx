import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaItem } from '../types/media';
import '../i18n';
import { MediaCard } from './MediaCard';

const dune: MediaItem = {
  id: 'movie-438631',
  tmdbId: 438631,
  tmdbType: 'movie',
  type: 'movie',
  title: 'Dune',
  titleAr: 'كثيب',
  description: 'A mythic and emotionally charged journey.',
  descriptionAr: 'رحلة أسطورية.',
  year: 2021,
  rating: 7.8,
  duration: '2h 35m',
  genre: ['Science Fiction'],
  genreAr: ['خيال علمي'],
  poster: '/dune.jpg',
  backdrop: '/dune-backdrop.jpg',
  trailer: '',
  video: '',
};

vi.mock('../services/tmdb', () => ({
  getDetails: vi.fn(async () => dune),
}));

describe('media card quick view', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.style.overflow = '';
  });

  it('opens details in a dialog without leaving the catalog', async () => {
    render(<MemoryRouter><MediaCard item={dune} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Quick view: Dune' }));
    expect(await screen.findByRole('dialog', { name: 'Dune' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Play now/i })).toHaveAttribute('href', '/watch/movie-438631');
    expect(screen.getByRole('link', { name: /View details/i })).toHaveAttribute('href', '/title/movie-438631');
  });
});
