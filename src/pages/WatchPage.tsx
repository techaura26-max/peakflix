import { ArrowLeft, Server, Film, Tv, Star, ArrowRight, ArrowLeft as ArrowLeftIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useLocalizedMedia } from '../hooks/useLocalizedMedia';
import { getDetails, getRecommendations } from '../services/tmdb';
import { RecommendationsRow } from '../components/RecommendationsRow';

interface Episode {
  id: number;
  episode_number: number;
  name: string;
  still_path: string | null;
  overview: string;
  vote_average: number;
}

interface Season {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
}

export function WatchPage() {
  const { id } = useParams();
  const location = useLocation();
  const [item, setItem] = useState<any | null>(null);
  const [status, setStatus] = useState('Loading Player...');
  const [error, setError] = useState('');
  
  const [activeServer, setActiveServer] = useState('VidSrc'); 
  
  const [activeSeason, setActiveSeason] = useState<number>(1);
  const [activeEpisode, setActiveEpisode] = useState<number>(1);
  const [seasonsList, setSeasonsList] = useState<Season[]>([]);
  const [episodesList, setEpisodesList] = useState<Episode[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // استخدام الـ hook الخاص بمشروعك لجلب اللغة الحالية المحددة من زر الهيدر
  const { title, currentLang } = useLocalizedMedia() as any; 

  // معرفة اللغة الحالية (عربي، إنجليزي، إسباني، ياباني...)، وإذا لم تتوفر نعتمد الإنجليزية كافتراضية
  const activeLanguage = currentLang || localStorage.getItem('peakflix-language') || (typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : 'en') || 'en';

  const idString = String(id || '');
  const isTv = idString.includes('tv') || location.pathname.includes('/tv/');
  const cleanId = idString.replace('movie-', '').replace('tv-', '').replace(/[^\d]/g, '');

  const TMDB_TOKEN = import.meta.env.VITE_TMDB_READ_TOKEN || import.meta.env.VITE_TMDB_TOKEN || '15d2ea6d0dc1d247f33d5298a0474ded';

  // نصوص واجهة المستخدم حسب اللغة الحالية لتغيير اتجاه الصفحة والكتابة
  const isRtl = activeLanguage === 'ar';
  
  const uiTexts: { [key: string]: { [key: string]: string } } = {
    ar: { 
      status: 'جاري فحص خوادم البث الحية المقطعة...', 
      serverTitle: 'سيرفرات البث الحية:', 
      serverBtn: 'سيرفر',
      currentSeason: 'الموسم الحالي:', 
      seasonOpt: 'الموسم',
      epBadge: 'حلقة',
      fallbackEpName: 'الحلقة',
      loadingEpisodes: 'جاري تحميل الحلقات الخاصة بهذا الموسم...', 
      noEpisodes: 'لا يوجد وصف متوفر لهذه الحلقة حالياً.', 
      prev: 'الحلقة السابقة', 
      next: 'الحلقة التالية', 
      tvBadge: 'بث مباشر للمسلسلات بقوة PEAKFLIX', 
      movieBadge: 'بث مباشر للأفلام بقوة PEAKFLIX' 
    },
    en: { 
      status: 'Checking live streaming servers...', 
      serverTitle: 'Live Streaming Servers:', 
      serverBtn: 'Server',
      currentSeason: 'Current Season:', 
      seasonOpt: 'Season',
      epBadge: 'Ep',
      fallbackEpName: 'Episode',
      loadingEpisodes: 'Loading episodes for this season...', 
      noEpisodes: 'No description available for this episode.', 
      prev: 'Previous Episode', 
      next: 'Next Episode', 
      tvBadge: 'Live Series Stream by PEAKFLIX', 
      movieBadge: 'Live Movie Stream by PEAKFLIX' 
    },
    es: { 
      status: 'Verificando servidores de streaming...', 
      serverTitle: 'Servidores en vivo:', 
      serverBtn: 'Servidor',
      currentSeason: 'Temporada actual:', 
      seasonOpt: 'Temporada',
      epBadge: 'Ep',
      fallbackEpName: 'Episodio',
      loadingEpisodes: 'Cargando episodios de esta temporada...', 
      noEpisodes: 'No hay descripción disponible.', 
      prev: 'Episodio anterior', 
      next: 'Siguiente episodio', 
      tvBadge: 'Serie en vivo por PEAKFLIX', 
      movieBadge: 'Película en vivo por PEAKFLIX' 
    },
    ja: { 
      status: 'ストリーミングサーバーを確認中...', 
      serverTitle: 'ライブサーバー:', 
      serverBtn: 'サーバー',
      currentSeason: '現在のシーズン:', 
      seasonOpt: 'シーズン',
      epBadge: '第',
      fallbackEpName: 'エピソード',
      loadingEpisodes: 'エピソードを読み込み中...', 
      noEpisodes: '説明はありません。', 
      prev: '前のエピソード', 
      next: '次のエピソード', 
      tvBadge: 'PEAKFLIXによるライブシリーズ', 
      movieBadge: 'PEAKFLIXによるライブ映画' 
    },
    fr: { 
      status: 'Vérification des serveurs...', 
      serverTitle: 'Serveurs en direct:', 
      serverBtn: 'Serveur',
      currentSeason: 'Saison actuelle:', 
      seasonOpt: 'Saison',
      epBadge: 'Ép',
      fallbackEpName: 'Épisode',
      loadingEpisodes: 'Chargement des épisodes...', 
      noEpisodes: 'Aucune description disponible.', 
      prev: 'Épisode précédent', 
      next: 'Épisode suivant', 
      tvBadge: 'Série en direct par PEAKFLIX', 
      movieBadge: 'Film en direct par PEAKFLIX' 
    },
    it: { 
      status: 'Controllo dei server...', 
      serverTitle: 'Server dal vivo:', 
      serverBtn: 'Server',
      currentSeason: 'Stagione attuale:', 
      seasonOpt: 'Server',
      epBadge: 'Ep',
      fallbackEpName: 'Episodio',
      loadingEpisodes: 'Caricamento episodi...', 
      noEpisodes: 'Nessuna descrizione disponibile.', 
      prev: 'Episodio precedente', 
      next: 'Prossimo episodio', 
      tvBadge: 'Serie dal vivo di PEAKFLIX', 
      movieBadge: 'Film dal vivo di PEAKFLIX' 
    },
    de: { 
      status: 'Streaming-Server werden überprüft...', 
      serverTitle: 'Live-Server:', 
      serverBtn: 'Server',
      currentSeason: 'Aktuelle Staffel:', 
      seasonOpt: 'Staffel',
      epBadge: 'Ep',
      fallbackEpName: 'Episode',
      loadingEpisodes: 'Episoden werden geladen...', 
      noEpisodes: 'Keine Beschreibung verfügbar.', 
      prev: 'Vorherige Episode', 
      next: 'Nächste Episode', 
      tvBadge: 'Live-Serien von PEAKFLIX', 
      movieBadge: 'Live-Filme von PEAKFLIX' 
    }
  };

  const text = uiTexts[activeLanguage] || uiTexts['en'];

  // 1. جلب بيانات العمل الأساسية والمواسم باللغة المختارة ديناميكياً
  useEffect(() => {
    if (cleanId) {
      getDetails(idString)
        .then((data) => {
          if (data) {
            setItem(data);
            setStatus('');
            if (data.tmdbType) {
              getRecommendations(idString, data.tmdbType).then(setRecommendations);
            }
            
            const rawData = data as any;
            if (rawData.seasons && Array.isArray(rawData.seasons)) {
              const realSeasons = rawData.seasons.filter((s: any) => s && s.season_number > 0);
              setSeasonsList(realSeasons);
              if (realSeasons.length > 0) {
                setActiveSeason(realSeasons[0].season_number);
              }
            } else {
              fetch(`https://api.themoviedb.org/3/tv/${cleanId}?language=${activeLanguage}`, {
                headers: {
                  Authorization: `Bearer ${TMDB_TOKEN}`,
                  'Content-Type': 'application/json;charset=utf-8'
                }
              })
                .then(res => res.json())
                .then(tvData => {
                  if (tvData && tvData.seasons && Array.isArray(tvData.seasons)) {
                    const realSeasons = tvData.seasons.filter((s: any) => s && s.season_number > 0);
                    setSeasonsList(realSeasons);
                    if (realSeasons.length > 0) {
                      setActiveSeason(realSeasons[0].season_number);
                    }
                  }
                }).catch(err => console.error(err));
            }
          }
        })
        .catch(() => {
          setError('Unable to load this title right now. The media service may be unavailable.');
          fetch(`https://api.themoviedb.org/3/tv/${cleanId}?language=${activeLanguage}`, {
            headers: {
              Authorization: `Bearer ${TMDB_TOKEN}`,
              'Content-Type': 'application/json;charset=utf-8'
            }
          })
            .then(res => res.json())
            .then(data => {
              if (data) {
                setItem(data);
                setStatus('');
                if (data.seasons && Array.isArray(data.seasons)) {
                  const realSeasons = data.seasons.filter((s: any) => s && s.season_number > 0);
                  setSeasonsList(realSeasons);
                  if (realSeasons.length > 0) {
                    setActiveSeason(realSeasons[0].season_number);
                  }
                }
              }
            }).catch(() => setStatus('Failed to load data from TMDB'));
        });
    }
  }, [idString, cleanId, TMDB_TOKEN, activeLanguage]);

  // 2. جلب الحلقات وتفاصيلها بناءً على اللغة المفعلة حالياً من زر الهيدر
  useEffect(() => {
    if (cleanId && activeSeason) {
      fetch(`https://api.themoviedb.org/3/tv/${cleanId}/season/${activeSeason}?language=${activeLanguage}`, {
        headers: {
          Authorization: `Bearer ${TMDB_TOKEN}`,
          'Content-Type': 'application/json;charset=utf-8'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.episodes && Array.isArray(data.episodes) && data.episodes.length > 0) {
            setEpisodesList(data.episodes);
          } else {
            // خطة بديلة للإسقاط للغة الإنجليزية في حال عدم توفر الترجمة للغة المحددة
            fetch(`https://api.themoviedb.org/3/tv/${cleanId}/season/${activeSeason}?language=en-US`, {
              headers: {
                Authorization: `Bearer ${TMDB_TOKEN}`,
                'Content-Type': 'application/json;charset=utf-8'
              }
            })
              .then(res => res.json())
              .then(enData => {
                if (enData && enData.episodes) {
                  setEpisodesList(enData.episodes);
                } else {
                  setEpisodesList([]);
                }
              }).catch(() => setEpisodesList([]));
          }
        })
        .catch(err => {
          console.error("Error fetching episodes: ", err);
          setEpisodesList([]);
          setError('Episode data could not be loaded. The stream server may be unavailable.');
        });
    }
  }, [activeSeason, cleanId, TMDB_TOKEN, activeLanguage]);

  if (!item && status.includes('Loading')) {
    return <div className="page-shell"><div className="empty-state"><h2>Loading Player...</h2></div></div>;
  }

  if (error) {
    return <div className="page-shell"><div className="empty-state"><h2>{error}</h2><p>Please try again in a moment or check back later.</p></div></div>;
  }

  // قائمة السيرفرات بالترتيب المحدد فقط
  const servers: { [key: string]: string } = {
    VidSrc: isTv
      ? `https://vidsrc.me/embed/tv?tmdb=${cleanId}&season=${activeSeason}&episode=${activeEpisode}`
      : `https://vidsrc.me/embed/movie?tmdb=${cleanId}`,

    VidSrcPM: isTv
      ? `https://vidsrc.pm/embed/tv?tmdb=${cleanId}&season=${activeSeason}&episode=${activeEpisode}`
      : `https://vidsrc.pm/embed/movie?tmdb=${cleanId}`,

    SmashyStream: isTv
      ? `https://embed.smashystream.com/playere.php?tmdb=${cleanId}&season=${activeSeason}&episode=${activeEpisode}`
      : `https://embed.smashystream.com/playere.php?tmdb=${cleanId}`,

    MultiEmbed: isTv 
      ? `https://multiembed.mov/?video_id=${cleanId}&tmdb=1&s=${activeSeason}&e=${activeEpisode}`
      : `https://multiembed.mov/?video_id=${cleanId}&tmdb=1`
  };

  const handleNextEpisode = () => {
    if (activeEpisode < episodesList.length) {
      setActiveEpisode(prev => prev + 1);
    }
  };

  const handlePrevEpisode = () => {
    if (activeEpisode > 1) {
      setActiveEpisode(prev => prev - 1);
    }
  };

  return (
    <div className="watch-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px', direction: isRtl ? 'rtl' : 'ltr' }}>
      <div className="watch-top" style={{ textAlign: isRtl ? 'right' : 'left' }}>
        <Link to={`/title/${idString}`}><ArrowLeft style={{ transform: isRtl ? 'rotate(180deg)' : 'none' }} /></Link>
        <div>
          <small style={{ display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-start' }}>
            {isTv ? <Tv size={12} color="#ff6b00" /> : <Film size={12} color="#ff6b00" />}
            {isTv ? text.tvBadge : text.movieBadge}
          </small>
          <h1 style={{ textAlign: isRtl ? 'right' : 'left' }}>
            {item ? title(item) : 'Loading...'} {isTv && <span style={{ color: '#ff6b00', fontSize: '16px' }}>({text.currentSeason.replace(':', '')} {activeSeason} - {activeLanguage === 'ar' ? 'الحلقة' : 'Ep'} {activeEpisode})</span>}
          </h1>
        </div>
      </div>

      {/* سيرفرات البث بالترتيب المحدد */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '15px', flexWrap: 'wrap', background: '#12141c', padding: '10px', borderRadius: '6px', border: '1px solid #222', alignItems: 'center' }}>
        <span style={{ color: '#aaa', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', marginLeft: isRtl ? '10px' : '0', marginRight: isRtl ? '0' : '10px' }}>
          <Server size={16} color="#ff6b00" /> {text.serverTitle}
        </span>
        {Object.keys(servers).map((srvKey) => (
          <button
            key={srvKey}
            onClick={() => setActiveServer(srvKey)}
            style={{
              background: activeServer === srvKey ? '#ff6b00' : '#08090d',
              color: '#fff',
              border: activeServer === srvKey ? '1px solid #ff6b00' : '1px solid #333',
              padding: '6px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {srvKey}
          </button>
        ))}
      </div>

      {/* الفريم الأساسي للفيديو */}
      <div className="player-frame" style={{ width: '100%', height: '70vh', background: '#000', position: 'relative', marginTop: '15px', borderRadius: '8px', overflow: 'hidden' }}>
        <iframe
          key={`${activeServer}-${activeSeason}-${activeEpisode}`}
          src={servers[activeServer]}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen *;"
          allowFullScreen={true}
          // @ts-ignore
          webkitallowfullscreen="true"
          // @ts-ignore
          mozallowfullscreen="true"
        />
      </div>

      {/* أزرار الانتقال الذكي متوافقة الاتجاه حسب اللغة */}
      {isTv && episodesList.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', background: '#0d0f14', padding: '12px 20px', borderRadius: '8px', border: '1px solid #1c1f2b' }}>
          
          {activeEpisode > 1 ? (
            <button 
              onClick={handlePrevEpisode}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1c1f2b', color: '#fff', border: '1px solid #333', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
            >
              {isRtl ? <ArrowRight size={16} color="#ff6b00" /> : <ArrowLeftIcon size={16} color="#ff6b00" />}
              {text.prev}
            </button>
          ) : <div />}

          {activeEpisode < episodesList.length ? (
            <button 
              onClick={handleNextEpisode}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ff6b00', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
            >
              {text.next}
              {isRtl ? <ArrowLeftIcon size={16} color="#fff" /> : <ArrowRight size={16} color="#fff" />}
            </button>
          ) : <div />}

        </div>
      )}

      {/* قائمة المواسم والحلقات */}
      {isTv && (
        <div style={{ marginTop: '20px' }}>
          
          {/* قسم اختيار السيزون */}
          {seasonsList.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: '#0b0c10', padding: '15px', borderRadius: '8px', border: '1px solid #1f222e', marginBottom: '20px' }}>
              <label style={{ color: '#fff', fontWeight: 'bold', fontSize: '16px' }}>{text.currentSeason}</label>
              <select 
                value={activeSeason}
                onChange={(e) => {
                  setActiveSeason(Number(e.target.value));
                  setActiveEpisode(1);
                }}
                style={{
                  background: '#12141c',
                  color: '#fff',
                  border: '1px solid #ff6b00',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {seasonsList.map((s) => (
                  <option key={s.id} value={s.season_number}>
                    {activeLanguage === 'ar' 
                      ? `الموسم ${s.season_number} (${s.episode_count} حلقة)` 
                      : `${text.seasonOpt} ${s.season_number} (${s.episode_count} ${activeLanguage === 'ja' ? 'エピソード' : activeLanguage === 'es' ? 'Episodios' : activeLanguage === 'fr' ? 'Épisodes' : 'Episodes'})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* قائمة الحلقات على شكل كروت */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {episodesList.map((ep) => {
              const imageUrl = ep.still_path 
                ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
                : 'https://via.placeholder.com/300x169/08090d/ffffff?text=PeakFlix';
                
              const isActive = activeEpisode === ep.episode_number;

              return (
                <div 
                  key={ep.id}
                  onClick={() => setActiveEpisode(ep.episode_number)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    background: isActive ? '#1c1f2b' : '#12141c',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: isActive ? '2px solid #ff6b00' : '1px solid #222',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    minHeight: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* صورة الحلقة */}
                  <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000' }}>
                    <img 
                      src={imageUrl} 
                      alt={ep.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                      {activeLanguage === 'ar' ? `حلقة ${ep.episode_number}` : `${text.epBadge} ${ep.episode_number}`}
                    </div>
                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontSize: '12px', background: 'rgba(0,0,0,0.75)', padding: '2px 8px', borderRadius: '4px' }}>
                      <Star size={12} color="#ff6b00" fill="#ff6b00" />
                      {(ep.vote_average || 0).toFixed(1)}
                    </div>
                  </div>

                  {/* تفاصيل الحلقة */}
                  <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, textAlign: isRtl ? 'right' : 'left' }}>
                    <h3 style={{ color: isActive ? '#ff6b00' : '#fff', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                      {ep.name || `${text.fallbackEpName} ${ep.episode_number}`}
                    </h3>

                    <p style={{ color: '#aaa', fontSize: '13px', margin: 0, lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: '3', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ep.overview || text.noEpisodes}
                    </p>
                  </div>
                </div>
              );
            })}
            
            {episodesList.length === 0 && (
              <p style={{ color: '#666', textAlign: 'center', marginTop: '20px' }}>{text.loadingEpisodes}</p>
            )}
          </div>

        </div>
      )}

      {recommendations.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <RecommendationsRow title={isRtl ? 'اقتراحات مشابهة' : 'Similar picks'} items={recommendations} />
        </div>
      )}
    </div>
  );
}