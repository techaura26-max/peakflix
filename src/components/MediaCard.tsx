import { motion } from 'framer-motion';
import { Play, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MediaItem } from '../types/media';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';

export function MediaCard({
  item,
  progress,
  linkTo,
  resumeLabel,
}: {
  item: MediaItem;
  progress?: number;
  linkTo?: string;
  resumeLabel?: string;
}) {
  const { title } = useLocalizedMedia();

  return (
    <motion.article className="media-card" whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.25 }}>
      <Link to={linkTo || `/title/${item.id}`} className="poster-wrap" aria-label={title(item)}>
        {item.poster ? <img src={item.poster} srcSet={`${item.poster.replace('/w500', '/w342')} 342w, ${item.poster} 500w`} sizes="(max-width: 700px) 45vw, 220px" alt={title(item)} loading="lazy" decoding="async" width="500" height="750" /> : <span className="poster-fallback">PEAKFLIX</span>}
        <div className="card-overlay">
          <span className="round-play"><Play fill="currentColor" /></span>
        </div>
        {progress !== undefined && (
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
        {resumeLabel ? <span className="resume-badge">{resumeLabel}</span> : null}
      </Link>
      <div className="card-info">
        <h3>{title(item)}</h3>
        <div>
          <span>{item.year}</span>
          <span><Star size={13} fill="currentColor" /> {item.rating}</span>
        </div>
      </div>
    </motion.article>
  );
}
