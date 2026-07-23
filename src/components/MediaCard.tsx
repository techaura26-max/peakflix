import { motion } from 'framer-motion';
import { Eye, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MediaItem } from '../types/media';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';
import { getCardProgress } from '../utils/library';
import { QuickViewModal } from './QuickViewModal';

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
  const { t } = useTranslation();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [localProgress, setLocalProgress] = useState(() => getCardProgress(item.id));
  const closeQuickView = useCallback(() => setQuickViewOpen(false), []);

  useEffect(() => {
    const update = () => setLocalProgress(getCardProgress(item.id));
    update();
    window.addEventListener('peakflix-library-change', update);
    return () => window.removeEventListener('peakflix-library-change', update);
  }, [item.id]);

  const displayedProgress = progress ?? localProgress;

  return (
    <motion.article className="media-card" whileHover={{ y: -8, scale: 1.02 }} transition={{ duration: 0.25 }}>
      <button type="button" className="poster-wrap" aria-label={`${t('quickView')}: ${title(item)}`} onClick={() => setQuickViewOpen(true)}>
        {item.poster ? <img src={item.poster} srcSet={`${item.poster.replace('/w500', '/w342')} 342w, ${item.poster} 500w`} sizes="(max-width: 700px) 45vw, 220px" alt={title(item)} loading="lazy" decoding="async" width="500" height="750" /> : <span className="poster-fallback">PEAKFLIX</span>}
        <div className="card-overlay">
          <span className="round-play"><Eye /></span>
        </div>
        {displayedProgress !== undefined && (
          <div className="progress-track" role="progressbar" aria-label={t('viewingProgress')} aria-valuenow={Math.round(displayedProgress)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${displayedProgress}%` }} />
          </div>
        )}
        {resumeLabel ? <span className="resume-badge">{resumeLabel}</span> : null}
      </button>
      <div className="card-info">
        <h3>{title(item)}</h3>
        <div>
          <span>{item.year}</span>
          <span><Star size={13} fill="currentColor" /> {item.rating}</span>
        </div>
      </div>
      <QuickViewModal item={item} open={quickViewOpen} onClose={closeQuickView} watchLink={linkTo} />
    </motion.article>
  );
}
