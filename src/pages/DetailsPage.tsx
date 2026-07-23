import { CheckCircle2, Clock3, ExternalLink, Heart, Play, Share2, Star, Watch, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../components/PageState';
import { RecommendationsRow } from '../components/RecommendationsRow';
import { Seo } from '../components/Seo';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';
import { getDetails, getRecommendations } from '../services/tmdb';
import type { MediaItem } from '../types/media';
import { isInLibrary, saveLibraryEntry, toggleLibraryEntry } from '../utils/library';

export function DetailsPage() {
  const { id = '' } = useParams();
  const { t, i18n } = useTranslation();
  const { title, description, ar } = useLocalizedMedia();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [favorite, setFavorite] = useState(false);
  const [watchLater, setWatchLater] = useState(false);
  const [watched, setWatched] = useState(false);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [shareNotice, setShareNotice] = useState('');
  const language = i18n.resolvedLanguage || 'en';

  useEffect(() => {
    let active = true;
    setItem(null);
    setError('');
    setRecommendations([]);
    getDetails(id)
      .then((data) => {
        if (!active) return;
        setItem(data);
        setFavorite(isInLibrary('favorites', data.id));
        setWatchLater(isInLibrary('watchLater', data.id));
        setWatched(isInLibrary('watched', data.id));
        if (data.tmdbType) getRecommendations(id, data.tmdbType).then((values) => { if (active) setRecommendations(values); });
      })
      .catch((reason) => { if (active) setError(reason.message || t('offlineError')); });
    return () => { active = false; };
  }, [attempt, id, language, t]);

  useEffect(() => {
    if (!trailerOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setTrailerOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [trailerOpen]);

  const genres = useMemo(() => (ar && item?.genreAr?.length ? item.genreAr : item?.genre) || [], [ar, item]);

  const share = async () => {
    if (!item) return;
    const data = { title: title(item), text: description(item).slice(0, 160), url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(window.location.href);
        setShareNotice(t('copied'));
        window.setTimeout(() => setShareNotice(''), 2200);
      }
    } catch {
      // The visitor may cancel the native share sheet.
    }
  };

  if (error) return <div className="page-shell"><ErrorState message={error} onRetry={() => setAttempt((value) => value + 1)} /></div>;
  if (!item) return <div className="page-shell"><LoadingState cards={5} /></div>;

  const runtime = item.runtimeMinutes
    ? `${Math.floor(item.runtimeMinutes / 60) ? `${Math.floor(item.runtimeMinutes / 60)} ${t('hourShort')} ` : ''}${item.runtimeMinutes % 60} ${t('minuteShort')}`
    : item.duration;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': item.tmdbType === 'movie' ? 'Movie' : 'TVSeries',
    name: title(item), description: description(item), image: item.poster, datePublished: item.year || undefined,
    aggregateRating: item.rating ? { '@type': 'AggregateRating', ratingValue: item.rating, bestRating: 10, ratingCount: item.voteCount || 1 } : undefined,
  };

  return (
    <div className="detail-page">
      <Seo title={title(item)} description={description(item)} image={item.backdrop || item.poster} jsonLd={jsonLd} />
      <div className="detail-backdrop" style={{ backgroundImage: `linear-gradient(0deg, rgba(8,9,13,0.96) 0%, rgba(8,9,13,0.55) 50%, rgba(8,9,13,0.22) 100%), url(${item.backdrop})` }} />
      <div className="detail-panel">
        <img className="detail-poster" src={item.poster} alt={title(item)} fetchPriority="high" />
        <div className="detail-copy">
          <span className="eyebrow">PEAKFLIX</span>
          <h1>{title(item)}</h1>
          {item.tagline ? <p className="detail-tagline">{item.tagline}</p> : null}
          <div className="meta">
            <span><Star size={16} fill="currentColor" /> {item.rating || '—'}</span>
            {item.year ? <span>{item.year}</span> : null}
            {runtime ? <span>{runtime}</span> : null}
            {item.certification ? <span>{item.certification}</span> : null}
            {item.episodes ? <span>{item.episodes} {t('episodes')}</span> : null}
          </div>
          <p>{description(item)}</p>
          <div className="chips">{genres.map((genre) => <span key={genre}>{genre}</span>)}</div>
          <dl className="detail-facts">
            {item.directors?.length ? <div><dt>{t('directedBy')}</dt><dd>{item.directors.join(', ')}</dd></div> : null}
            {item.certification ? <div><dt>{t('ageRating')}</dt><dd>{item.certification}</dd></div> : null}
            {item.status ? <div><dt>{t('status')}</dt><dd>{item.status}</dd></div> : null}
            {item.seasons ? <div><dt>{t('seasons')}</dt><dd>{item.seasons}</dd></div> : null}
          </dl>
          {item.providers?.length ? (
            <div className="provider-block">
              <h3>{t('availableOn')}</h3>
              <div className="provider-list">{item.providers.map((provider) => <span className="provider-chip" key={provider.id}>{provider.logo ? <img src={provider.logo} alt="" /> : null}{provider.name}</span>)}</div>
            </div>
          ) : null}
          <div className="hero-buttons detail-actions">
            <Link className="primary-btn" to={`/watch/${item.id}`} onClick={() => saveLibraryEntry('continueWatching', item)}><Play fill="currentColor" />{t('play')}</Link>
            {item.trailerKey ? <button type="button" className="secondary-btn" onClick={() => setTrailerOpen(true)}><Watch size={18} />{t('trailer')}</button> : null}
            <button type="button" className="secondary-btn" aria-pressed={favorite} onClick={() => setFavorite(toggleLibraryEntry('favorites', item))}><Heart size={18} fill={favorite ? 'currentColor' : 'none'} />{favorite ? t('favorite') : t('addFavorite')}</button>
            <button type="button" className="secondary-btn" aria-pressed={watchLater} onClick={() => setWatchLater(toggleLibraryEntry('watchLater', item))}><Clock3 size={18} />{watchLater ? t('saved') : t('watchLater')}</button>
            <button type="button" className="secondary-btn" aria-pressed={watched} onClick={() => setWatched(toggleLibraryEntry('watched', item))}><CheckCircle2 size={18} fill={watched ? 'currentColor' : 'none'} />{watched ? t('markUnwatched') : t('markWatched')}</button>
            <button type="button" className="secondary-btn" onClick={share}><Share2 size={18} />{shareNotice || t('share')}</button>
            {item.providerLink ? <a className="secondary-btn" href={item.providerLink} target="_blank" rel="noreferrer"><ExternalLink size={18} />{t('whereToWatch')}</a> : null}
          </div>
        </div>
      </div>

      <div className="content-shell detail-extras">
        {item.cast?.length ? (
          <section className="cast-section">
            <div className="section-heading"><h2>{t('cast')}</h2></div>
            <div className="cast-grid">{item.cast.map((person) => <article key={person.id}>{person.photo ? <img src={person.photo} alt={person.name} loading="lazy" /> : <span className="cast-fallback" /> }<strong>{person.name}</strong><small>{person.role}</small></article>)}</div>
          </section>
        ) : null}
        {item.seasonList?.length ? (
          <section className="season-summary"><div className="section-heading"><h2>{t('seasons')}</h2></div><div>{item.seasonList.map((season) => <Link key={season.id} to={`/watch/${item.id}`} state={{ season: season.season_number }}><strong>{season.name}</strong><span>{season.episode_count} {t('episodes')}</span></Link>)}</div></section>
        ) : null}
        {recommendations.length ? <RecommendationsRow title={t('similarPicks')} items={recommendations} /> : null}
      </div>

      {trailerOpen && item.trailerKey ? (
        <div className="trailer-modal" role="dialog" aria-modal="true" aria-label={t('trailer')} onMouseDown={(event) => { if (event.target === event.currentTarget) setTrailerOpen(false); }}>
          <div className="trailer-modal__content">
            <button type="button" className="trailer-close" aria-label={t('close')} onClick={() => setTrailerOpen(false)}><X /></button>
            <iframe src={`https://www.youtube-nocookie.com/embed/${item.trailerKey}?autoplay=1`} title={`${title(item)} ${t('trailer')}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
        </div>
      ) : null}
    </div>
  );
}
