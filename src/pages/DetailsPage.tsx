import { BookMarked, Clock3, ExternalLink, Heart, Play, Star, Watch } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MediaItem } from '../types/media';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';
import { getDetails, getRecommendations } from '../services/tmdb';
import { getLibrary, saveLibraryEntry, toggleLibraryEntry } from '../utils/library';
import { RecommendationsRow } from '../components/RecommendationsRow';

export function DetailsPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { title, description, ar } = useLocalizedMedia();
  const [item, setItem] = useState<MediaItem | null>(null);
  const [error, setError] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [watchLater, setWatchLater] = useState(false);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (id) {
      getDetails(id)
        .then((data) => {
          setItem(data);
          if (data.tmdbType) {
            getRecommendations(id, data.tmdbType).then(setRecommendations);
          }
        })
        .catch((e) => setError(e.message));
    }
  }, [id]);

  useEffect(() => {
    if (!item) return;
    const favorites = getLibrary('favorites').some((entry) => entry.id === item.id);
    const later = getLibrary('watchLater').some((entry) => entry.id === item.id);
    setFavorite(favorites);
    setWatchLater(later);
  }, [item]);

  const toggleFavorite = () => {
    if (!item) return;
    setFavorite(toggleLibraryEntry('favorites', item));
  };

  const toggleLater = () => {
    if (!item) return;
    setWatchLater(toggleLibraryEntry('watchLater', item));
  };

  const saveContinueWatching = () => {
    if (!item) return;
    saveLibraryEntry('continueWatching', item);
  };

  const genres = useMemo(() => (ar && item?.genreAr?.length ? item.genreAr : item?.genre) || [], [ar, item]);

  if (error) return <div className="page-shell"><div className="empty-state"><h2>{error}</h2><p>Please try again in a moment or check back later.</p></div></div>;
  if (!item) return <div className="page-shell"><div className="empty-state"><h2>Loading...</h2></div></div>;

  return (
    <div className="detail-page">
      <div className="detail-backdrop" style={{ backgroundImage: `linear-gradient(0deg, rgba(8,9,13,0.92) 0%, rgba(8,9,13,0.52) 45%, rgba(8,9,13,0.2) 100%), url(${item.backdrop})` }} />
      <div className="detail-panel">
        <img className="detail-poster" src={item.poster} alt={title(item)} />
        <div className="detail-copy">
          <span className="eyebrow">PEAKFLIX</span>
          <h1>{title(item)}</h1>
          <div className="meta">
            <span><Star size={16} fill="currentColor" /> {item.rating}</span>
            <span>{item.year}</span>
            {item.duration ? <span>{item.duration}</span> : null}
            {item.episodes ? <span>{item.episodes} Episodes</span> : null}
          </div>
          <p>{description(item)}</p>
          <div className="chips">{genres.map((g) => <span key={g}>{g}</span>)}</div>
          {item.providers?.length ? (
            <div className="provider-block">
              <h3>{ar ? 'متاح للمشاهدة على' : 'Available on'}</h3>
              <div className="provider-list">
                {item.providers.map((p) => (
                  <span className="provider-chip" key={p.id}>
                    {p.logo ? <img src={p.logo} alt="" /> : null}
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="hero-buttons">
            <Link className="primary-btn" to={`/watch/${item.id}`} onClick={saveContinueWatching}>
              <Play fill="currentColor" />
              {t('play')}
            </Link>
            <button className="secondary-btn" onClick={toggleFavorite}>
              <Heart size={18} fill={favorite ? 'currentColor' : 'none'} />
              {favorite ? (ar ? 'مفضل' : 'Favorite') : (ar ? 'إضافة للمفضلة' : 'Add to favorites')}
            </button>
            <button className="secondary-btn" onClick={toggleLater}>
              <Clock3 size={18} />
              {watchLater ? (ar ? 'في المؤقت' : 'Saved') : (ar ? 'مشاهدة لاحقًا' : 'Watch later')}
            </button>
            {item.providerLink ? (
              <a className="secondary-btn" href={item.providerLink} target="_blank" rel="noreferrer">
                <ExternalLink size={18} />
                {ar ? 'أماكن المشاهدة' : 'Where to watch'}
              </a>
            ) : null}
            {item.trailer ? (
              <a className="secondary-btn" href={item.trailer} target="_blank" rel="noreferrer">
                <Watch size={18} />
                {t('trailer')}
              </a>
            ) : null}
          </div>
        </div>
      </div>
      {recommendations.length ? <div className="content-shell"><RecommendationsRow title={ar ? 'اقتراحات مشابهة' : 'Similar picks'} items={recommendations} /></div> : null}
    </div>
  );
}