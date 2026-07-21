import { ChevronRight } from 'lucide-react';
import type { MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';

export function MediaRow({ title, items, progress = {} }: { title: string; items: MediaItem[]; progress?: Record<string, number> }) {
  if (!items.length) return null;

  return (
    <section className="media-section">
      <div className="section-heading">
        <h2>{title}</h2>
        <ChevronRight />
      </div>
      <div className="media-grid">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} progress={progress[item.id]} />
        ))}
      </div>
    </section>
  );
}
