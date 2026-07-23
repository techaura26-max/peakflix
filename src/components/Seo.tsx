import { useEffect } from 'react';

interface SeoProps {
  title?: string;
  description?: string;
  image?: string;
  jsonLd?: Record<string, unknown>;
}

function setMeta(selector: string, value: string) {
  const element = document.head.querySelector<HTMLMetaElement>(selector);
  if (element) element.content = value;
}

export function Seo({ title, description, image, jsonLd }: SeoProps) {
  useEffect(() => {
    const pageTitle = title ? `${title} · PeakFlix` : 'PeakFlix — Find your next story';
    const pageDescription = description || 'Discover trending movies, series, anime and personalized recommendations.';
    document.title = pageTitle;
    setMeta('meta[name="description"]', pageDescription);
    setMeta('meta[property="og:title"]', pageTitle);
    setMeta('meta[property="og:description"]', pageDescription);
    if (image) setMeta('meta[property="og:image"]', image);

    const existing = document.getElementById('peakflix-jsonld');
    existing?.remove();
    if (jsonLd) {
      const script = document.createElement('script');
      script.id = 'peakflix-jsonld';
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => document.getElementById('peakflix-jsonld')?.remove();
  }, [description, image, jsonLd, title]);

  return null;
}
