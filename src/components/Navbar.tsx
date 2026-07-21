import { Globe2, LogIn, LogOut, Menu, Search, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandMark } from './BrandMark';

const links = [
  ['/', 'home'], ['/category/movie', 'movies'], ['/category/series', 'series'], ['/category/turkish-drama', 'turkishDrama'],
  ['/category/anime', 'anime'], ['/category/turkish-series', 'turkishSeries']
];

const languages = [
  { code: 'en', name: 'EN' }, { code: 'ar', name: 'ع' }, { code: 'es', name: 'ES' },
  { code: 'ja', name: 'JA' }, { code: 'fr', name: 'FR' }, { code: 'it', name: 'IT' }, { code: 'de', name: 'DE' }
];

export function Navbar() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const langRef = useRef<HTMLDivElement>(null);

  // إغلاق القائمة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (e: any) => { if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('peakflix-language', lng);
    setLangOpen(false);
  };

  const submit = (e: React.FormEvent) => { e.preventDefault(); if (query.trim()) navigate(`/search?q=${encodeURIComponent(query)}`); };

  return <header className="navbar">
    <Link className="brand" to="/"><span className="brand-icon"><BrandMark size={18}/></span>PEAK<span>FLIX</span></Link>
    <nav className={open ? 'nav-links open' : 'nav-links'}>
      {links.map(([to, key]) => <NavLink key={to} to={to} onClick={() => setOpen(false)}>{t(key)}</NavLink>)}
    </nav>
    <div className="nav-actions">
      <form className="mini-search" onSubmit={submit}><Search size={17}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder={t('search')}/></form>
      
      {/* زر قائمة اللغات */}
      <div className="lang-dropdown" ref={langRef} style={{ position: 'relative' }}>
        <button className="icon-btn" onClick={() => setLangOpen(!langOpen)}><Globe2 size={19}/><span>{i18n.resolvedLanguage?.toUpperCase()}</span></button>
        {langOpen && (
          <div style={{ position: 'absolute', top: '100%', right: 0, background: '#12141c', border: '1px solid #333', borderRadius: '8px', padding: '5px', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
            {languages.map(lng => (
              <button key={lng.code} onClick={() => changeLanguage(lng.code)} style={{ padding: '8px 15px', color: i18n.resolvedLanguage === lng.code ? '#ff6b00' : '#fff', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>
                {lng.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {user ? <><Link className="icon-btn" to="/profile"><span>{user}</span></Link><button className="icon-btn" onClick={logout}><LogOut size={19}/><span>{t('logout')}</span></button></> : <Link className="icon-btn" to="/login"><LogIn size={19}/><span>{t('login')}</span></Link>}
      <button className="mobile-menu" onClick={()=>setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
    </div>
  </header>;
}