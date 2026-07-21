import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useTranslation } from 'react-i18next';
import { BrandMark } from './BrandMark';

export function Layout(){ const {t,i18n}=useTranslation(); const dir=i18n.resolvedLanguage==='ar'?'rtl':'ltr'; return <div dir={dir}><Navbar/><main><Outlet/></main><footer><strong><span className="brand-icon brand-icon--footer"><BrandMark size={18}/></span>PEAK<span>FLIX</span></strong><p>{t('allRights')}</p><small>© 2026 PeakFlix</small></footer></div> }
