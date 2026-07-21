import { motion } from 'framer-motion';
import { Play, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MediaItem } from '../types/media';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';

export function MediaCard({ item, progress }: { item: MediaItem; progress?: number }) {
  const { title } = useLocalizedMedia();

  return (
    <motion.article className="media-card" whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.25 }}>
      <Link to={`/title/${item.id}`} className="poster-wrap">
        <img src={item.poster} alt={title(item)} />
        <div className="card-overlay">
          <span className="round-play"><Play fill="currentColor" /></span>
        </div>
        {progress !== undefined && (
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
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
