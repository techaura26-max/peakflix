import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Info, Play, Sparkles, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';
import type { MediaItem } from '../types/media';

export function Hero({ items, compact = false }: { items: MediaItem[]; compact?: boolean }) {
  const { t } = useTranslation();
  const { title, description } = useLocalizedMedia();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  useEffect(() => {
    if (!items.length) return;
    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [items]);

  const activeItem = items[activeIndex];
  if (!activeItem) return null;

  const goTo = (index: number) => setActiveIndex(index);
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  const goNext = () => setActiveIndex((prev) => (prev + 1) % items.length);

  return (
    <section
      className={`hero${compact ? ' hero-compact' : ''}`}
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(2,6,23,0.97) 0%, rgba(2,6,23,0.72) 38%, rgba(2,6,23,0.2) 100%), linear-gradient(180deg, rgba(8,9,13,0.15) 0%, rgba(8,9,13,0.75) 100%), url(${activeItem.backdrop})`,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activeItem.id}
          className="hero-content"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.7 }}
        >
          <div className="hero-badge hero-badge--trending">
            <Sparkles size={16} />
            <span>{t('trending').toUpperCase()}</span>
          </div>
          <h1>{title(activeItem)}</h1>
          <div className="meta">
            <span><Star size={16} fill="currentColor" /> {activeItem.rating}</span>
            <span>{activeItem.year}</span>
            {activeItem.duration ? <span>{activeItem.duration}</span> : null}
            <span className="quality">4K</span>
          </div>
          <p>{description(activeItem)}</p>
          <div className="hero-buttons">
            <Link className="primary-btn" to={`/watch/${activeItem.id}`}>
              <Play size={19} fill="currentColor" />
              {t('play')}
            </Link>
            <Link className="secondary-btn" to={`/title/${activeItem.id}`}>
              <Info size={19} />
              {t('details')}
            </Link>
          </div>
        </motion.div>
      </AnimatePresence>

      {items.length > 1 && (
        <div className="hero-controls">
          <div className="hero-nav">
            <button type="button" className="hero-arrow" onClick={goPrev}>
              <ChevronLeft size={18} />
            </button>
            <button type="button" className="hero-arrow" onClick={goNext}>
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="hero-dots">
            {items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`hero-dot ${index === activeIndex ? 'active' : ''}`}
                onClick={() => goTo(index)}
                aria-label={`Go to ${index + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}