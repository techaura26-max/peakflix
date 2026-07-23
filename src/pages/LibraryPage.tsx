import { Download, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaCard } from '../components/MediaCard';
import { Seo } from '../components/Seo';
import type { LibraryEntry, MediaItem } from '../types/media';
import {
  clearLibrary,
  createLibraryBackup,
  getLibrary,
  removeLibraryEntry,
  restoreLibraryBackup,
  type LibraryKind,
} from '../utils/library';

function toMedia(entry: LibraryEntry): MediaItem {
  return {
    id: entry.id, title: entry.title, titleAr: entry.titleAr, localizedTitle: entry.localizedTitle, localizedLanguage: entry.localizedLanguage,
    description: '', descriptionAr: '', year: entry.year,
    rating: entry.rating, duration: '', genre: entry.genre || [], genreAr: entry.genreAr || [], genreIds: entry.genreIds || [],
    poster: entry.poster, backdrop: entry.backdrop, trailer: '', video: '', type: entry.type, tmdbType: entry.tmdbType,
  };
}

const tabs: Array<{ kind: LibraryKind; key: string }> = [
  { kind: 'continueWatching', key: 'continueWatching' },
  { kind: 'favorites', key: 'favorites' },
  { kind: 'watchLater', key: 'watchLater' },
  { kind: 'history', key: 'history' },
  { kind: 'watched', key: 'watched' },
];

export function LibraryPage() {
  const { t } = useTranslation();
  const [active, setActive] = useState<LibraryKind>('continueWatching');
  const [, setVersion] = useState(0);
  const [notice, setNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const entries = getLibrary(active);

  useEffect(() => {
    const update = () => setVersion((value) => value + 1);
    window.addEventListener('peakflix-library-change', update);
    return () => window.removeEventListener('peakflix-library-change', update);
  }, []);

  const exportLibrary = () => {
    const blob = new Blob([JSON.stringify(createLibraryBackup(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `peakflix-library-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importLibrary = async (file?: File) => {
    if (!file) return;
    try {
      restoreLibraryBackup(JSON.parse(await file.text()));
      setNotice(t('backupImported'));
    } catch {
      setNotice(t('invalidBackup'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clearActive = () => {
    if (!window.confirm(t('clearConfirm'))) return;
    clearLibrary(active);
  };

  return (
    <div className="page-shell library-page">
      <Seo title={t('libraryTitle')} description={t('libraryDescription')} />
      <div className="page-banner library-heading">
        <span>PEAKFLIX</span>
        <h1>{t('libraryTitle')}</h1>
        <p>{t('libraryDescription')}</p>
      </div>
      <div className="library-toolbar">
        <div className="library-tabs" role="tablist">
          {tabs.map((tab) => (
            <button type="button" role="tab" aria-selected={active === tab.kind} className={active === tab.kind ? 'is-active' : ''} key={tab.kind} onClick={() => setActive(tab.kind)}>{t(tab.key)}</button>
          ))}
        </div>
        <div className="library-actions">
          <button type="button" className="secondary-btn" onClick={exportLibrary}><Download size={16} />{t('exportLibrary')}</button>
          <button type="button" className="secondary-btn" onClick={() => inputRef.current?.click()}><Upload size={16} />{t('importLibrary')}</button>
          <input ref={inputRef} className="visually-hidden" type="file" aria-label={t('importLibrary')} accept="application/json,.json" onChange={(event) => importLibrary(event.target.files?.[0])} />
          {entries.length ? <button type="button" className="danger-btn" onClick={clearActive}><Trash2 size={16} />{t('clear')}</button> : null}
        </div>
      </div>
      {notice ? <p className="library-notice" role="status">{notice}</p> : null}
      {entries.length ? (
        <div className="catalog-grid library-grid">
          {entries.map((entry) => (
            <div className="library-item" key={entry.id}>
              <MediaCard
                item={toMedia(entry)}
                linkTo={active === 'continueWatching' ? `/watch/${entry.id}` : `/title/${entry.id}`}
                resumeLabel={entry.season && entry.episode ? `S${entry.season} · E${entry.episode}` : undefined}
              />
              <button type="button" className="library-remove" onClick={() => removeLibraryEntry(active, entry.id)}><Trash2 size={15} />{t('remove')}</button>
            </div>
          ))}
        </div>
      ) : <div className="empty-state"><h2>{t('emptyLibrary')}</h2></div>}
    </div>
  );
}
