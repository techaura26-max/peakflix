import { AnimatePresence, motion } from 'framer-motion';
import { Info, Play, Star, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';
import { getDetails } from '../services/tmdb';
import type { MediaItem } from '../types/media';

export function QuickViewModal({
  item,
  open,
  onClose,
  watchLink,
}: {
  item: MediaItem;
  open: boolean;
  onClose: () => void;
  watchLink?: string;
}) {
  const { t, i18n } = useTranslation();
  const { title, description } = useLocalizedMedia();
  const [details, setDetails] = useState<MediaItem>(item);
  const [loading, setLoading] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const language = i18n.resolvedLanguage || 'en';

  useEffect(() => {
    if (!open) return;
    let active = true;
    setDetails(item);
    setLoading(true);
    getDetails(item.id)
      .then((value) => { if (active) setDetails(value); })
      .catch(() => { if (active) setDetails(item); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [item, language, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="quick-view"
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            className="quick-view__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="quick-view__backdrop"
              style={details.backdrop ? { backgroundImage: `url(${details.backdrop})` } : undefined}
            />
            <button ref={closeRef} type="button" className="quick-view__close" onClick={onClose} aria-label={t('close')}>
              <X size={21} />
            </button>
            <div className="quick-view__content">
              <span className="quick-view__eyebrow">{details.tmdbType === 'tv' ? t('tvSeries') : t('movie')}</span>
              <h2 id={headingId}>{title(details)}</h2>
              <div className="quick-view__meta">
                {details.year ? <span>{details.year}</span> : null}
                {details.rating ? <span><Star size={14} fill="currentColor" />{details.rating}</span> : null}
                {details.certification ? <span>{details.certification}</span> : null}
                {details.duration ? <span>{details.duration}</span> : null}
              </div>
              <p>{description(details)}</p>
              {details.genre?.length ? <div className="quick-view__genres">{details.genre.slice(0, 4).map((genre) => <span key={genre}>{genre}</span>)}</div> : null}
              {loading ? <small className="quick-view__loading">{t('loading')}</small> : null}
              <div className="quick-view__actions">
                <Link className="primary-btn" to={watchLink || `/watch/${details.id}`} onClick={onClose}>
                  <Play size={18} fill="currentColor" />{t('play')}
                </Link>
                <Link className="secondary-btn" to={`/title/${details.id}`} onClick={onClose}>
                  <Info size={18} />{t('details')}
                </Link>
              </div>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
