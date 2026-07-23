import { describe, expect, it } from 'vitest';
import { parsePlayerProgressMessage } from './playback';

describe('player progress messages', () => {
  it('reads nested player time updates', () => {
    expect(parsePlayerProgressMessage({
      type: 'PLAYER_EVENT',
      data: { currentTime: 321.5, duration: 3600 },
    })).toEqual({ currentTime: 321.5, duration: 3600 });
  });

  it('reads JSON MEDIA_DATA messages and rejects invalid values', () => {
    expect(parsePlayerProgressMessage('{"type":"MEDIA_DATA","data":{"current_time":"90","duration":"120"}}'))
      .toEqual({ currentTime: 90, duration: 120 });
    expect(parsePlayerProgressMessage({ currentTime: 200, duration: 100 })).toBeUndefined();
  });

  it('reads VidSrcPM storage relay values', () => {
    expect(parsePlayerProgressMessage({
      type: 'STORAGE_SET',
      key: 'watch_movie_27205',
      value: '{"currentTime":42.25,"duration":8880}',
    })).toEqual({ currentTime: 42.25, duration: 8880 });
  });
});
