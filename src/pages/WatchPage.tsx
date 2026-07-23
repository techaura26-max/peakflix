import { ArrowLeft, ArrowRight, CheckCircle2, Film, Server, Star, Tv } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { RecommendationsRow } from '../components/RecommendationsRow';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';
import { getDetails, getRecommendations, getSeasonEpisodes } from '../services/tmdb';
import type { MediaEpisode, MediaItem, MediaSeason } from '../types/media';
import {
  getPlaybackPosition,
  getWatchProgress,
  isEpisodeWatched,
  savePlaybackPosition,
  saveWatchProgress,
  toggleEpisodeWatched,
} from '../utils/library';
import { ErrorState, LoadingState } from '../components/PageState';
import { Seo } from '../components/Seo';
import { parsePlayerProgressMessage } from '../utils/playback';

export const STREAMING_SERVERS = ['VidSrcPM', 'VidSrc', 'SmashyStream', 'MultiEmbed'] as const;
type ServerName = typeof STREAMING_SERVERS[number];

export function streamUrl(server: ServerName, tmdbId: number, isTv: boolean, season: number, episode: number) {
  const tvSuffix = `season=${season}&episode=${episode}`;
  if (server === 'VidSrc') return isTv ? `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&${tvSuffix}` : `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`;
  if (server === 'VidSrcPM') return isTv ? `https://vidsrc.pm/embed/tv?tmdb=${tmdbId}&${tvSuffix}` : `https://vidsrc.pm/embed/movie?tmdb=${tmdbId}`;
  if (server === 'SmashyStream') return isTv ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&${tvSuffix}` : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`;
  return isTv
    ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${episode}`
    : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`;
}

export function WatchPage() {
  const { id = '' } = useParams();
  const { i18n, t } = useTranslation();
  const { title } = useLocalizedMedia();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [seasons, setSeasons] = useState<MediaSeason[]>([]);
  const [episodes, setEpisodes] = useState<MediaEpisode[]>([]);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [activeServer, setActiveServer] = useState<ServerName>('VidSrcPM');
  const savedProgress = useMemo(() => getWatchProgress(id), [id]);
  const [activeSeason, setActiveSeason] = useState(savedProgress?.season || 1);
  const [activeEpisode, setActiveEpisode] = useState(savedProgress?.episode || 1);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [, setWatchedVersion] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastPlayerSave = useRef(0);
  const language = i18n.resolvedLanguage || localStorage.getItem('peakflix-language') || 'en';
  const ar = language === 'ar';
  const isTv = item?.tmdbType === 'tv' || id.startsWith('tv-');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setEpisodes([]);

    getDetails(id)
      .then((details) => {
        if (!active) return;
        setItem(details);
        const validSeasons = (details.seasonList || []).filter((season) => season.season_number > 0);
        setSeasons(validSeasons);
        const saved = getWatchProgress(id);
        const firstSeason = validSeasons[0]?.season_number || 1;
        const savedSeasonExists = saved?.season && (!validSeasons.length || validSeasons.some((season) => season.season_number === saved.season));
        setActiveSeason(savedSeasonExists ? saved.season! : firstSeason);
        setActiveEpisode(savedSeasonExists && saved?.episode ? saved.episode : 1);
        if (details.tmdbType) getRecommendations(id, details.tmdbType).then((values) => { if (active) setRecommendations(values); });
      })
      .catch((reason) => { if (active) setError(reason.message || 'Unable to load this title.'); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [attempt, id, language]);

  useEffect(() => {
    if (!item?.tmdbId || item.tmdbType !== 'tv') return;
    let active = true;
    setEpisodesLoading(true);
    getSeasonEpisodes(item.tmdbId, activeSeason)
      .then((values) => {
        if (!active) return;
        setEpisodes(values);
        setActiveEpisode((current) => (
          values.some((episode) => episode.episode_number === current) ? current : values[0]?.episode_number || 1
        ));
      })
      .catch(() => { if (active) setEpisodes([]); })
      .finally(() => { if (active) setEpisodesLoading(false); });
    return () => { active = false; };
  }, [activeSeason, item?.tmdbId, item?.tmdbType, language]);

  useEffect(() => {
    if (!item) return;
    saveWatchProgress(item, isTv ? activeSeason : undefined, isTv ? activeEpisode : undefined, isTv ? episodes.length : undefined);
  }, [activeEpisode, activeSeason, episodes.length, isTv, item]);

  useEffect(() => {
    if (!item) return;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const progress = parsePlayerProgressMessage(event.data);
      if (!progress || Date.now() - lastPlayerSave.current < 2500) return;
      lastPlayerSave.current = Date.now();
      savePlaybackPosition(
        item,
        progress.currentTime,
        progress.duration,
        isTv ? activeSeason : undefined,
        isTv ? activeEpisode : undefined,
        isTv ? episodes.length : undefined,
      );
      setWatchedVersion((value) => value + 1);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [activeEpisode, activeSeason, episodes.length, isTv, item]);

  const stream = item?.tmdbId ? streamUrl(activeServer, item.tmdbId, isTv, activeSeason, activeEpisode) : '';
  const currentEpisodeIndex = episodes.findIndex((episode) => episode.episode_number === activeEpisode);
  const currentSeasonIndex = seasons.findIndex((season) => season.season_number === activeSeason);
  const canGoBack = currentEpisodeIndex > 0 || currentSeasonIndex > 0;
  const canGoForward = (currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1)
    || (currentSeasonIndex >= 0 && currentSeasonIndex < seasons.length - 1);
  const savedPosition = getPlaybackPosition(id, isTv ? activeSeason : undefined, isTv ? activeEpisode : undefined);

  const goBack = () => {
    if (currentEpisodeIndex > 0) {
      setActiveEpisode(episodes[currentEpisodeIndex - 1].episode_number);
      return;
    }
    const previousSeason = seasons[currentSeasonIndex - 1];
    if (!previousSeason) return;
    setActiveSeason(previousSeason.season_number);
    setActiveEpisode(Math.max(1, previousSeason.episode_count));
  };

  const goForward = () => {
    if (currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1) {
      setActiveEpisode(episodes[currentEpisodeIndex + 1].episode_number);
      return;
    }
    const nextSeason = seasons[currentSeasonIndex + 1];
    if (!nextSeason) return;
    setActiveSeason(nextSeason.season_number);
    setActiveEpisode(1);
  };

  if (loading) return <div className="page-shell"><LoadingState cards={4} /></div>;
  if (error || !item) return <div className="page-shell"><ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /></div>;

  return (
    <div className="watch-page" dir={ar ? 'rtl' : 'ltr'}>
      <Seo title={`${title(item)} · ${t('play')}`} description={item.description} image={item.backdrop} />
      <div className="watch-top">
        <Link to={`/title/${id}`} aria-label={t('backDetails')}><ArrowLeft /></Link>
        <div>
          <small>{isTv ? <Tv size={13} /> : <Film size={13} />}{isTv ? t('seriesPlayer') : t('moviePlayer')}</small>
          <h1>{title(item)} {isTv ? <span>{t('season')} {activeSeason} · {t('episode')} {activeEpisode}</span> : null}</h1>
        </div>
        <span className="watch-saved">
          <CheckCircle2 size={15} />
          {t('progressSaved')}
          {savedPosition?.currentTime ? ` · ${Math.floor(savedPosition.currentTime / 60)} ${t('minuteShort')}` : ''}
        </span>
      </div>

      <div className="server-picker" aria-label={t('streamingServers')}>
        <span><Server size={16} />{t('chooseServer')}</span>
        {STREAMING_SERVERS.map((server) => (
          <button key={server} className={server === activeServer ? 'is-active' : ''} onClick={() => setActiveServer(server)}>{server}</button>
        ))}
      </div>

      <div className="player-frame">
        <iframe
          ref={iframeRef}
          key={`${activeServer}-${activeSeason}-${activeEpisode}`}
          src={stream}
          title={`${title(item)} player`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="origin"
        />
      </div>

      {isTv && episodes.length ? (
        <div className="episode-navigation">
          <button disabled={!canGoBack} onClick={goBack}>
            <ArrowLeft size={17} />{t('previousEpisode')}
          </button>
          <button disabled={!canGoForward} onClick={goForward}>
            {t('nextEpisode')}<ArrowRight size={17} />
          </button>
        </div>
      ) : null}

      {isTv ? (
        <section className="episode-browser">
          {seasons.length ? (
            <label className="season-picker">
              <span>{t('season')}</span>
              <select value={activeSeason} onChange={(event) => { setActiveSeason(Number(event.target.value)); setActiveEpisode(1); }}>
                {seasons.map((season) => <option key={season.id} value={season.season_number}>{season.name || `${t('season')} ${season.season_number}`} ({season.episode_count})</option>)}
              </select>
            </label>
          ) : null}

          {episodesLoading ? <p className="load-status">{t('loadingEpisodes')}</p> : null}
          <div className="episode-grid">
            {episodes.map((episode) => (
              <article
                key={episode.id}
                className={`episode-card ${episode.episode_number === activeEpisode ? 'is-active' : ''}`}
              >
                <button type="button" className="episode-select" onClick={() => setActiveEpisode(episode.episode_number)}>
                  <span className="episode-card__image">
                    {episode.still_path ? <img src={`https://image.tmdb.org/t/p/w500${episode.still_path}`} alt="" loading="lazy" /> : <span>PEAKFLIX</span>}
                    <small>{t('episode')} {episode.episode_number}</small>
                    {episode.vote_average ? <em><Star size={12} fill="currentColor" />{episode.vote_average.toFixed(1)}</em> : null}
                  </span>
                  <strong>{episode.name || `${t('episode')} ${episode.episode_number}`}</strong>
                  <p>{episode.overview || t('noDescription')}</p>
                </button>
                <button
                  type="button"
                  className={`episode-watched ${isEpisodeWatched(item.id, activeSeason, episode.episode_number) ? 'is-watched' : ''}`}
                  aria-label={isEpisodeWatched(item.id, activeSeason, episode.episode_number) ? t('markUnwatched') : t('markWatched')}
                  aria-pressed={isEpisodeWatched(item.id, activeSeason, episode.episode_number)}
                  onClick={() => { toggleEpisodeWatched(item, activeSeason, episode.episode_number); setWatchedVersion((value) => value + 1); }}
                >
                  <CheckCircle2 size={17} />{isEpisodeWatched(item.id, activeSeason, episode.episode_number) ? t('watched') : t('markWatched')}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {recommendations.length ? <RecommendationsRow title={t('moreLikeThis')} items={recommendations} /> : null}
    </div>
  );
}
