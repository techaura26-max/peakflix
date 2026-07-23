import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Outlet } from 'react-router-dom';
import { isRtlLanguage, normalizeLanguage } from '../i18n/languages';
import { BrandMark } from './BrandMark';
import { Navbar } from './Navbar';
import { PwaControls } from './PwaControls';

export function Layout() {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage);
  const direction = isRtlLanguage(language) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [direction, language]);

  return (
    <div dir={direction}>
      <a className="skip-link" href="#main-content">{t('skipContent')}</a>
      <Navbar />
      <PwaControls />
      <main id="main-content"><Outlet /></main>
      <footer>
        <strong><span className="brand-icon brand-icon--footer"><BrandMark size={18} /></span>PEAK<span>FLIX</span></strong>
        <nav className="footer-links" aria-label={t('navigation')}>
          <Link to="/about">{t('about')}</Link>
          <Link to="/privacy">{t('privacy')}</Link>
          <Link to="/disclaimer">{t('disclaimer')}</Link>
        </nav>
        <p>{t('tmdbAttribution')}</p>
        <small>© {new Date().getFullYear()} PeakFlix · {t('allRights')}</small>
      </footer>
    </div>
  );
}
