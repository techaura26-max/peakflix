import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: { translation: {
    home: 'Home', movies: 'Movies', series: 'Series', anime: 'Anime', turkishSeries: 'Turkish Series', turkishDrama: 'Korean Drama',
    search: 'Search movies, series, anime…', trending: 'Trending', trendingMovies: 'Trending Movies', trendingSeries: 'Trending Series', trendingAnime: 'Trending Anime',
    continueWatching: 'Continue Watching', play: 'Play now', trailer: 'Watch trailer', details: 'View details',
    noResults: 'No titles found', browse: 'Browse collection', rating: 'Rating', episodes: 'Episodes', resume: 'Resume', guest: 'Guest',
    allRights: 'This app is for demo and entertainment purposes only.'
  }},
  ar: { translation: {
    home: 'الرئيسية', movies: 'أفلام', series: 'مسلسلات', anime: 'أنمي', turkishSeries: 'مسلسلات تركية', turkishDrama: 'دراما كورية',
    search: 'ابحث عن فيلم أو مسلسل أو أنمي…', trending: 'ترند', trendingMovies: 'أفلام ترند', trendingSeries: 'مسلسلات ترند', trendingAnime: 'أنميات ترند',
    continueWatching: 'أكمل المشاهدة', play: 'شاهد الآن', trailer: 'شاهد الإعلان', details: 'عرض التفاصيل',
    noResults: 'لم يتم العثور على نتائج', browse: 'تصفح المحتوى', rating: 'التقييم', episodes: 'الحلقات', resume: 'متابعة', guest: 'زائر',
    allRights: 'هذا التطبيق للاستخدام التجريبي والترفيهي فقط.'
  }},
  es: { translation: {
    home: 'Inicio', movies: 'Películas', series: 'Series', anime: 'Anime', turkishSeries: 'Series Turcas', turkishDrama: 'Drama Coreano',
    search: 'Buscar películas, series, anime…', trending: 'Tendencia', trendingMovies: 'Películas Tendencia', trendingSeries: 'Series Tendencia', trendingAnime: 'Anime Tendencia',
    continueWatching: 'Continuar viendo', play: 'Ver ahora', trailer: 'Ver tráiler', details: 'Ver detalles',
    noResults: 'No se encontraron resultados', browse: 'Explorar colección', rating: 'Valoración', episodes: 'Episodios', resume: 'Reanudar', guest: 'Invitado',
    allRights: 'Esta aplicación es solo para fines de demostración y entretenimiento.'
  }},
  ja: { translation: {
    home: 'ホーム', movies: '映画', series: 'シリーズ', anime: 'アニメ', turkishSeries: 'トルコドラマ', turkishDrama: '韓国ドラマ',
    search: '映画、シリーズ、アニメを検索…', trending: 'トレンド', trendingMovies: '人気の映画', trendingSeries: '人気のシリーズ', trendingAnime: '人気のアニメ',
    continueWatching: '視聴を続ける', play: '今すぐ再生', trailer: '予告編を見る', details: '詳細を見る',
    noResults: '結果が見つかりません', browse: 'コレクションを閲覧', rating: '評価', episodes: 'エピソード', resume: '再開', guest: 'ゲスト',
    allRights: 'このアプリはデモとエンターテイメント目的のみです。'
  }},
  fr: { translation: {
    home: 'Accueil', movies: 'Films', series: 'Séries', anime: 'Anime', turkishSeries: 'Séries Turques', turkishDrama: 'Drama Coréen',
    search: 'Rechercher films, séries, anime…', trending: 'Tendance', trendingMovies: 'Films tendances', trendingSeries: 'Séries tendances', trendingAnime: 'Animes tendances',
    continueWatching: 'Continuer la lecture', play: 'Lire maintenant', trailer: 'Voir la bande-annonce', details: 'Voir les détails',
    noResults: 'Aucun résultat trouvé', browse: 'Parcourir la collection', rating: 'Note', episodes: 'Épisodes', resume: 'Reprendre', guest: 'Invité',
    allRights: 'Cette application est uniquement destinée à la démo et au divertissement.'
  }},
  it: { translation: {
    home: 'Home', movies: 'Film', series: 'Serie TV', anime: 'Anime', turkishSeries: 'Serie Turche', turkishDrama: 'Drammi Coreani',
    search: 'Cerca film, serie, anime…', trending: 'Tendenza', trendingMovies: 'Film di tendenza', trendingSeries: 'Serie di tendenza', trendingAnime: 'Anime di tendenza',
    continueWatching: 'Continua a guardare', play: 'Riproduci', trailer: 'Guarda il trailer', details: 'Dettagli',
    noResults: 'Nessun risultato', browse: 'Esplora', rating: 'Valutazione', episodes: 'Episodi', resume: 'Riprendi', guest: 'Ospite',
    allRights: 'Questa app è solo a scopo dimostrativo e di intrattenimento.'
  }},
  de: { translation: {
    home: 'Startseite', movies: 'Filme', series: 'Serien', anime: 'Anime', turkishSeries: 'Türkische Serien', turkishDrama: 'Koreanisches Drama',
    search: 'Filme, Serien, Anime suchen…', trending: 'Trend', trendingMovies: 'Beliebte Filme', trendingSeries: 'Beliebte Serien', trendingAnime: 'Beliebte Anime',
    continueWatching: 'Weiter schauen', play: 'Jetzt abspielen', trailer: 'Trailer ansehen', details: 'Details ansehen',
    noResults: 'Keine Ergebnisse gefunden', browse: 'Sammlung durchsuchen', rating: 'Bewertung', episodes: 'Episoden', resume: 'Fortsetzen', guest: 'Gast',
    allRights: 'Diese App ist nur zu Demo- und Unterhaltungszwecken gedacht.'
  }}
};

const saved = localStorage.getItem('peakflix-language') || localStorage.getItem('cinevault-language') || 'en';
i18n.use(initReactI18next).init({ 
  resources, 
  lng: saved, 
  fallbackLng: 'en', 
  interpolation: { escapeValue: false },
  supportedLngs: ['en', 'ar', 'es', 'ja', 'fr', 'it', 'de']
});

export default i18n;
