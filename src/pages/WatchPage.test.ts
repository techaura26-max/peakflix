import { describe, expect, it } from 'vitest';
import { STREAMING_SERVERS, streamUrl } from './WatchPage';

describe('watch servers', () => {
  it('uses VidSrcPM as the first server', () => {
    expect(STREAMING_SERVERS[0]).toBe('VidSrcPM');
  });

  it('builds movie and episode URLs with TMDB identifiers', () => {
    expect(streamUrl('VidSrcPM', 27205, false, 1, 1)).toBe('https://vidsrc.pm/embed/movie?tmdb=27205');
    expect(streamUrl('VidSrcPM', 1396, true, 2, 3)).toContain('tmdb=1396&season=2&episode=3');
  });
});
