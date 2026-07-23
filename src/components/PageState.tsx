import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MediaSkeleton } from './MediaSkeleton';

export function LoadingState({ cards = 8 }: { cards?: number }) {
  const { t } = useTranslation();
  return <div className="page-state" aria-live="polite"><span>{t('loading')}</span><MediaSkeleton count={cards} /></div>;
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="empty-state error-state" role="alert">
      <AlertTriangle size={42} />
      <h2>{message || t('offlineError')}</h2>
      {onRetry ? <button type="button" className="secondary-btn" onClick={onRetry}><RefreshCw size={17} />{t('retry')}</button> : null}
    </div>
  );
}
