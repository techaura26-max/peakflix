import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hero } from '../components/Hero';
import { MediaCard } from '../components/MediaCard';
import type { MediaItem, MediaType } from '../types/media';
import { getCategory } from '../services/tmdb';
import { useTranslation } from 'react-i18next';

export function CategoryPage(){
 const {type}=useParams(); 
 const {i18n}=useTranslation();
 const currentLang = i18n.resolvedLanguage || localStorage.getItem('peakflix-language') || 'en';
 const category=(type||'movie') as MediaType;
 const [items,setItems]=useState<MediaItem[]>([]); const [featured,setFeatured]=useState<MediaItem[]>([]); const [page,setPage]=useState(1); const [totalPages,setTotalPages]=useState(1); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
 
 const labels:Record<string,Record<string,string>>={
   movie: { en: 'Movies', ar: 'الأفلام', es: 'Películas', ja: '映画', fr: 'Films', it: 'Film', de: 'Filme' },
   series: { en: 'Series', ar: 'المسلسلات', es: 'Series', ja: 'シリーズ', fr: 'Séries', it: 'Serie TV', de: 'Serien' },
   anime: { en: 'Anime', ar: 'الأنمي', es: 'Anime', ja: 'アニメ', fr: 'Anime', it: 'Anime', de: 'Anime' },
   'turkish-series': { en: 'Turkish Series', ar: 'المسلسلات التركية', es: 'Series Turcas', ja: 'トルコドラマ', fr: 'Séries Turques', it: 'Serie Turche', de: 'Türkische Serien' },
   'turkish-drama': { en: 'Korean Drama', ar: 'الدراما الكورية', es: 'Drama Coreano', ja: '韓国ドラマ', fr: 'Drama Coréen', it: 'Drammi Coreani', de: 'Koreanisches Drama' }
 };

 useEffect(()=>{
   setItems([]);setPage(1);setLoading(true);
   getCategory(category,1).then(r=>{setItems(r.items);setFeatured(r.featured);setTotalPages(r.totalPages)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))
 },[category, currentLang]);

 const more=()=>{
   const next=page+1;setLoading(true);
   getCategory(category,next).then(r=>{setItems(v=>[...v,...r.items]);setPage(next);setTotalPages(r.totalPages)}).catch(e=>setError(e.message)).finally(()=>setLoading(false))
 };

 const currentLabel = labels[category]?.[currentLang] || labels[category]?.['en'] || 'Explore';

 return <div className="page-shell"><div className="page-banner"><span>EXPLORE PEAKFLIX</span><h1>{currentLabel}</h1></div>{featured.length > 0 && <Hero items={featured} />}{error&&<div className="empty-state"><h2>{error}</h2></div>}<div className="catalog-grid">{items.map(x=><MediaCard key={x.id} item={x}/>)}</div>{loading&&<div className="load-status">Loading...</div>}{!loading&&page<totalPages&&<button className="load-more" onClick={more}>Load more</button>}</div>;
}