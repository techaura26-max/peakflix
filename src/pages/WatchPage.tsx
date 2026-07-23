import { ArrowLeft, ArrowRight, CheckCircle2, Film, Server, Star, Tv } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { RecommendationsRow } from '../components/RecommendationsRow';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';
import { getDetails, getRecommendations, getSeasonEpisodes } from '../services/tmdb';
import type { MediaEpisode, MediaItem, MediaSeason } from '../types/media';
import { getWatchProgress, saveWatchProgress } from '../utils/library';

const SERVERS = ['VidSrc', 'VidSrcPM', 'SmashyStream', 'MultiEmbed'] as const;
type ServerName = typeof SERVERS[number];

function streamUrl(server: ServerName, tmdbId: number, isTv: boolean, season: number, episode: number) {
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
  const { i18n } = useTranslation();
  const { title } = useLocalizedMedia();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [seasons, setSeasons] = useState<MediaSeason[]>([]);
  const [episodes, setEpisodes] = useState<MediaEpisode[]>([]);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [activeServer, setActiveServer] = useState<ServerName>('VidSrc');
  const savedProgress = useMemo(() => getWatchProgress(id), [id]);
  const [activeSeason, setActiveSeason] = useState(savedProgress?.season || 1);
  const [activeEpisode, setActiveEpisode] = useState(savedProgress?.episode || 1);
  const [loading, setLoading] = useState(true);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [error, setError] = useState('');
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
  }, [id, language]);

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

  const stream = item?.tmdbId ? streamUrl(activeServer, item.tmdbId, isTv, activeSeason, activeEpisode) : '';
  const currentEpisodeIndex = episodes.findIndex((episode) => episode.episode_number === activeEpisode);
  const canGoBack = currentEpisodeIndex > 0;
  const canGoForward = currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1;

  if (loading) return <div className="page-shell"><div className="empty-state"><h2>{ar ? 'جاري تحميل المشغل…' : 'Loading player…'}</h2></div></div>;
  if (error || !item) return <div className="page-shell"><div className="empty-state"><h2>{error || 'Title unavailable'}</h2><p>{ar ? 'حاول مرة أخرى بعد قليل.' : 'Please try again in a moment.'}</p></div></div>;

  return (
    <div className="watch-page" dir={ar ? 'rtl' : 'ltr'}>
      <div className="watch-top">
        <Link to={`/title/${id}`} aria-label={ar ? 'العودة للتفاصيل' : 'Back to details'}><ArrowLeft /></Link>
        <div>
          <small>{isTv ? <Tv size={13} /> : <Film size={13} />}{isTv ? (ar ? 'مشاهدة مسلسل' : 'Series player') : (ar ? 'مشاهدة فيلم' : 'Movie player')}</small>
          <h1>{title(item)} {isTv ? <span>{ar ? `الموسم ${activeSeason} · الحلقة ${activeEpisode}` : `S${activeSeason} · E${activeEpisode}`}</span> : null}</h1>
        </div>
        <span className="watch-saved"><CheckCircle2 size={15} />{ar ? 'يُحفظ تلقائياً' : 'Progress saved locally'}</span>
      </div>

      <div className="server-picker" aria-label={ar ? 'خوادم المشاهدة' : 'Streaming servers'}>
        <span><Server size={16} />{ar ? 'اختر السيرفر:' : 'Choose a server:'}</span>
        {SERVERS.map((server) => (
          <button key={server} className={server === activeServer ? 'is-active' : ''} onClick={() => setActiveServer(server)}>{server}</button>
        ))}
      </div>

      <div className="player-frame">
        <iframe
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
          <button disabled={!canGoBack} onClick={() => setActiveEpisode(episodes[currentEpisodeIndex - 1].episode_number)}>
            <ArrowLeft size={17} />{ar ? 'الحلقة السابقة' : 'Previous episode'}
          </button>
          <button disabled={!canGoForward} onClick={() => setActiveEpisode(episodes[currentEpisodeIndex + 1].episode_number)}>
            {ar ? 'الحلقة التالية' : 'Next episode'}<ArrowRight size={17} />
          </button>
        </div>
      ) : null}

      {isTv ? (
        <section className="episode-browser">
          {seasons.length ? (
            <label className="season-picker">
              <span>{ar ? 'الموسم' : 'Season'}</span>
              <select value={activeSeason} onChange={(event) => { setActiveSeason(Number(event.target.value)); setActiveEpisode(1); }}>
                {seasons.map((season) => <option key={season.id} value={season.season_number}>{season.name || `${ar ? 'الموسم' : 'Season'} ${season.season_number}`} ({season.episode_count})</option>)}
              </select>
            </label>
          ) : null}

          {episodesLoading ? <p className="load-status">{ar ? 'جاري تحميل الحلقات…' : 'Loading episodes…'}</p> : null}
          <div className="episode-grid">
            {episodes.map((episode) => (
              <button
                key={episode.id}
                className={`episode-card ${episode.episode_number === activeEpisode ? 'is-active' : ''}`}
                onClick={() => setActiveEpisode(episode.episode_number)}
              >
                <span className="episode-card__image">
                  {episode.still_path ? <img src={`https://image.tmdb.org/t/p/w500${episode.still_path}`} alt="" loading="lazy" /> : <span>PEAKFLIX</span>}
                  <small>{ar ? `حلقة ${episode.episode_number}` : `Episode ${episode.episode_number}`}</small>
                  {episode.vote_average ? <em><Star size={12} fill="currentColor" />{episode.vote_average.toFixed(1)}</em> : null}
                </span>
                <strong>{episode.name || `${ar ? 'الحلقة' : 'Episode'} ${episode.episode_number}`}</strong>
                <p>{episode.overview || (ar ? 'لا يوجد وصف متاح لهذه الحلقة.' : 'No description is available for this episode.')}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {recommendations.length ? <RecommendationsRow title={ar ? 'اقتراحات مشابهة' : 'More like this'} items={recommendations} /> : null}
    </div>
  );
}
