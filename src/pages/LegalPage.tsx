import { useTranslation } from 'react-i18next';
import { Seo } from '../components/Seo';

type LegalKind = 'about' | 'privacy' | 'disclaimer';

export function LegalPage({ kind }: { kind: LegalKind }) {
  const { t } = useTranslation();
  const title = t(`${kind}Title`);
  const body = t(`${kind}Body`);
  return (
    <article className="page-shell legal-page">
      <Seo title={title} description={body} />
      <span className="eyebrow">PEAKFLIX</span>
      <h1>{title}</h1>
      <p>{body}</p>
      {kind === 'disclaimer' ? <p>{t('tmdbAttribution')}</p> : null}
    </article>
  );
}
