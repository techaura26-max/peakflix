import type { MediaItem } from '../types/media';
import { MediaCard } from './MediaCard';

export function RecommendationsRow({ title, items }: { title: string; items: MediaItem[] }) {
  if (!items?.length) return null;

  return (
    <section className="media-section">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      <div className="media-grid">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
