import { ChevronRight } from 'lucide-react';
import type { MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';

export function MediaRow({
  title,
  items,
  progress = {},
  linkFor,
  labelFor,
}: {
  title: string;
  items: MediaItem[];
  progress?: Record<string, number>;
  linkFor?: (item: MediaItem) => string;
  labelFor?: (item: MediaItem) => string | undefined;
}) {
  if (!items.length) return null;

  return (
    <section className="media-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <ChevronRight />
      </div>
      <div className="media-grid">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            progress={progress[item.id]}
            linkTo={linkFor?.(item)}
            resumeLabel={labelFor?.(item)}
          />
        ))}
      </div>
    </section>
  );
}
