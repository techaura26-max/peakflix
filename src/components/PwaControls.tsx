import { Download, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaControls() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('peakflix-update-ready', onUpdate);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('peakflix-update-ready', onUpdate);
    };
  }, []);

  if ((!installPrompt && !updateReady) || dismissed) return null;

  const install = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <aside className="app-notice" aria-live="polite">
      {updateReady ? <span>{t('updateAvailable')}</span> : <span>{t('installApp')}</span>}
      {updateReady ? (
        <button type="button" onClick={() => window.location.reload()}><RefreshCw size={16} />{t('refresh')}</button>
      ) : (
        <button type="button" onClick={install}><Download size={16} />{t('installApp')}</button>
      )}
      <button type="button" className="app-notice__close" aria-label={t('close')} onClick={() => setDismissed(true)}><X size={16} /></button>
    </aside>
  );
}
