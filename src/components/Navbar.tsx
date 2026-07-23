import { BookOpen, Globe2, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BrandMark } from './BrandMark';
import { SearchAutocomplete } from './SearchAutocomplete';

const links = [
  ['/', 'home'], ['/category/movie', 'movies'], ['/category/series', 'series'], ['/category/korean-drama', 'koreanDrama'],
  ['/category/anime', 'anime'], ['/category/turkish-series', 'turkishSeries'], ['/library', 'library'],
] as const;

const languages = [{ code: 'en', name: 'English' }, { code: 'ar', name: 'العربية' }] as const;

export function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) setLangOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('menu-open', open);
    return () => document.body.classList.remove('menu-open');
  }, [open]);

  const changeLanguage = async (language: 'en' | 'ar') => {
    await i18n.changeLanguage(language);
    localStorage.setItem('peakflix-language', language);
    setLangOpen(false);
  };

  return (
    <header className="navbar">
      <Link className="brand" to="/" aria-label={`PeakFlix · ${t('home')}`}><span className="brand-icon"><BrandMark size={18} /></span>PEAK<span>FLIX</span></Link>
      <nav id="primary-navigation" aria-label={t('navigation')} className={open ? 'nav-links open' : 'nav-links'}>
        {links.map(([to, key]) => (
          <NavLink key={to} to={to} end={to === '/'}>{key === 'library' ? <BookOpen size={16} /> : null}{t(key)}</NavLink>
        ))}
      </nav>
      {open ? <button type="button" className="nav-scrim" aria-label={t('closeMenu')} onClick={() => setOpen(false)} /> : null}
      <div className="nav-actions">
        <SearchAutocomplete className="mini-search" placeholder={t('search')} />
        <div className="lang-dropdown" ref={langRef}>
          <button type="button" className="icon-btn" aria-label={t('language')} aria-expanded={langOpen} onClick={() => setLangOpen((value) => !value)}>
            <Globe2 size={19} /><span>{i18n.resolvedLanguage?.toUpperCase()}</span>
          </button>
          {langOpen ? (
            <div className="lang-menu" role="menu">
              {languages.map((language) => (
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={i18n.resolvedLanguage === language.code}
                  key={language.code}
                  onClick={() => changeLanguage(language.code)}
                >
                  {language.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" className="mobile-menu" aria-controls="primary-navigation" aria-expanded={open} aria-label={open ? t('closeMenu') : t('openMenu')} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
