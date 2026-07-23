import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  home: 'Home', movies: 'Movies', series: 'Series', anime: 'Anime', turkishSeries: 'Turkish Series', koreanDrama: 'Korean Drama', library: 'My Library',
  search: 'Search movies, series, anime…', trending: 'Trending', trendingMovies: 'Trending Movies', trendingSeries: 'Trending Series', trendingAnime: 'Trending Anime',
  continueWatching: 'Continue Watching', recommended: 'Recommended for you', play: 'Play now', trailer: 'Watch trailer', details: 'View details', browse: 'Browse collection',
  loading: 'Loading…', loadMore: 'Load more', retry: 'Try again', noResults: 'No titles found', noDescription: 'No description is available.', offlineError: 'We could not load this content. Check your connection and try again.',
  rating: 'Rating', episodes: 'Episodes', seasons: 'Seasons', resume: 'Resume', movie: 'Movie', tvSeries: 'Series', explore: 'Explore PeakFlix', hourShort: 'h', minuteShort: 'm',
  suggestions: 'Suggestions', recentSearches: 'Recent searches', startTyping: 'Start typing to discover movies, series, and anime.', searching: 'Searching…', noMatching: 'No matching titles',
  filters: 'Filters', mediaType: 'Media type', allTypes: 'All types', genre: 'Genre', allGenres: 'All genres', originalLanguage: 'Original language', allLanguages: 'All languages', year: 'Year', anyYear: 'Any year', minimumRating: 'Minimum rating', anyRating: 'Any rating',
  sortBy: 'Sort by', mostRelevant: 'Most relevant', mostPopular: 'Most popular', highestRated: 'Highest rated', newest: 'Newest', resultsCount: '{{count}} results', clearFilters: 'Clear filters',
  availableOn: 'Available on', addFavorite: 'Add to favorites', favorite: 'Favorite', watchLater: 'Watch later', saved: 'Saved', whereToWatch: 'Where to watch', similarPicks: 'Similar picks',
  cast: 'Cast', directedBy: 'Directed by', ageRating: 'Age rating', status: 'Status', share: 'Share', copied: 'Link copied', close: 'Close',
  libraryTitle: 'My Library', libraryDescription: 'Your private collection is saved only in this browser.', favorites: 'Favorites', history: 'History', watched: 'Watched',
  emptyLibrary: 'Nothing here yet. Add titles while browsing PeakFlix.', remove: 'Remove', clear: 'Clear section', exportLibrary: 'Export library', importLibrary: 'Import library', backupImported: 'Library imported successfully.', invalidBackup: 'That file is not a valid PeakFlix backup.',
  markWatched: 'Mark watched', markUnwatched: 'Mark unwatched', clearConfirm: 'Clear everything in this section?',
  seriesPlayer: 'Series player', moviePlayer: 'Movie player', progressSaved: 'Progress saved locally', chooseServer: 'Choose a server:', streamingServers: 'Streaming servers', backDetails: 'Back to details', season: 'Season', episode: 'Episode', previousEpisode: 'Previous episode', nextEpisode: 'Next episode', loadingEpisodes: 'Loading episodes…', moreLikeThis: 'More like this',
  about: 'About', privacy: 'Privacy', disclaimer: 'Disclaimer', installApp: 'Install app', updateAvailable: 'A new PeakFlix version is ready.', refresh: 'Refresh',
  aboutTitle: 'About PeakFlix', aboutBody: 'PeakFlix is a student-built media discovery experience for exploring movies, series, anime, Korean drama, and Turkish series.',
  privacyTitle: 'Privacy', privacyBody: 'PeakFlix has no accounts or database. Favorites, history, search terms, and viewing progress stay in your browser. Clearing site data removes them.',
  disclaimerTitle: 'Disclaimer', disclaimerBody: 'PeakFlix does not host media files. Availability and third-party players are provided for demonstration purposes and remain the responsibility of their respective providers.',
  tmdbAttribution: 'This product uses the TMDB API but is not endorsed or certified by TMDB.', allRights: 'Demo and entertainment project.',
  somethingWrong: 'Something went wrong', unexpectedError: 'The page hit an unexpected error. You can safely return home and try again.', backHome: 'Back to home',
  navigation: 'Primary navigation', openMenu: 'Open menu', closeMenu: 'Close menu', language: 'Language', skipContent: 'Skip to content', slide: 'Go to slide {{number}}', previousSlide: 'Previous title', nextSlide: 'Next title',
  quickView: 'Quick view', viewingProgress: 'Viewing progress',
};

const ar: typeof en = {
  home: 'الرئيسية', movies: 'الأفلام', series: 'المسلسلات', anime: 'الأنمي', turkishSeries: 'مسلسلات تركية', koreanDrama: 'دراما كورية', library: 'مكتبتي',
  search: 'ابحث عن فيلم أو مسلسل أو أنمي…', trending: 'الأكثر رواجًا', trendingMovies: 'أفلام رائجة', trendingSeries: 'مسلسلات رائجة', trendingAnime: 'أنمي رائج',
  continueWatching: 'أكمل المشاهدة', recommended: 'مختارات لك', play: 'شاهد الآن', trailer: 'شاهد الإعلان', details: 'عرض التفاصيل', browse: 'تصفح المحتوى',
  loading: 'جاري التحميل…', loadMore: 'عرض المزيد', retry: 'حاول مجددًا', noResults: 'لم نعثر على عناوين', noDescription: 'لا يوجد وصف متاح.', offlineError: 'تعذر تحميل المحتوى. تحقق من الاتصال وحاول مجددًا.',
  rating: 'التقييم', episodes: 'الحلقات', seasons: 'المواسم', resume: 'متابعة', movie: 'فيلم', tvSeries: 'مسلسل', explore: 'استكشف PeakFlix', hourShort: 'س', minuteShort: 'د',
  suggestions: 'اقتراحات', recentSearches: 'عمليات البحث الأخيرة', startTyping: 'ابدأ بالكتابة لاكتشاف الأفلام والمسلسلات والأنمي.', searching: 'جاري البحث…', noMatching: 'لا توجد عناوين مطابقة',
  filters: 'الفلاتر', mediaType: 'نوع المحتوى', allTypes: 'كل الأنواع', genre: 'التصنيف', allGenres: 'كل التصنيفات', originalLanguage: 'اللغة الأصلية', allLanguages: 'كل اللغات', year: 'السنة', anyYear: 'كل السنوات', minimumRating: 'أقل تقييم', anyRating: 'أي تقييم',
  sortBy: 'الترتيب', mostRelevant: 'الأكثر صلة', mostPopular: 'الأكثر شعبية', highestRated: 'الأعلى تقييمًا', newest: 'الأحدث', resultsCount: '{{count}} نتيجة', clearFilters: 'مسح الفلاتر',
  availableOn: 'متاح للمشاهدة على', addFavorite: 'إضافة للمفضلة', favorite: 'مفضل', watchLater: 'مشاهدة لاحقًا', saved: 'محفوظ', whereToWatch: 'أماكن المشاهدة', similarPicks: 'اقتراحات مشابهة',
  cast: 'طاقم التمثيل', directedBy: 'إخراج', ageRating: 'التصنيف العمري', status: 'الحالة', share: 'مشاركة', copied: 'تم نسخ الرابط', close: 'إغلاق',
  libraryTitle: 'مكتبتي', libraryDescription: 'مجموعتك الخاصة محفوظة في هذا المتصفح فقط.', favorites: 'المفضلة', history: 'سجل المشاهدة', watched: 'تمت مشاهدته',
  emptyLibrary: 'لا يوجد شيء هنا بعد. أضف العناوين أثناء تصفح PeakFlix.', remove: 'إزالة', clear: 'مسح القسم', exportLibrary: 'تصدير المكتبة', importLibrary: 'استيراد المكتبة', backupImported: 'تم استيراد المكتبة بنجاح.', invalidBackup: 'هذا الملف ليس نسخة PeakFlix صالحة.',
  markWatched: 'تحديد كمُشاهد', markUnwatched: 'إلغاء علامة المشاهدة', clearConfirm: 'هل تريد مسح كل محتوى هذا القسم؟',
  seriesPlayer: 'مشغل المسلسل', moviePlayer: 'مشغل الفيلم', progressSaved: 'التقدم محفوظ محليًا', chooseServer: 'اختر السيرفر:', streamingServers: 'خوادم المشاهدة', backDetails: 'العودة للتفاصيل', season: 'الموسم', episode: 'الحلقة', previousEpisode: 'الحلقة السابقة', nextEpisode: 'الحلقة التالية', loadingEpisodes: 'جاري تحميل الحلقات…', moreLikeThis: 'اقتراحات مشابهة',
  about: 'عن الموقع', privacy: 'الخصوصية', disclaimer: 'إخلاء المسؤولية', installApp: 'تثبيت التطبيق', updateAvailable: 'نسخة جديدة من PeakFlix جاهزة.', refresh: 'تحديث',
  aboutTitle: 'عن PeakFlix', aboutBody: 'PeakFlix تجربة طلابية لاكتشاف الأفلام والمسلسلات والأنمي والدراما الكورية والمسلسلات التركية.',
  privacyTitle: 'الخصوصية', privacyBody: 'لا يملك PeakFlix حسابات أو قاعدة بيانات. تبقى المفضلة والسجل وعمليات البحث وتقدم المشاهدة داخل متصفحك، ويؤدي مسح بيانات الموقع إلى حذفها.',
  disclaimerTitle: 'إخلاء المسؤولية', disclaimerBody: 'لا يستضيف PeakFlix ملفات الوسائط. التوفر والمشغلات الخارجية مقدمة لأغراض العرض وتبقى مسؤولية مزوديها.',
  tmdbAttribution: 'يستخدم هذا المنتج واجهة TMDB، لكنه غير معتمد أو مصدّق من TMDB.', allRights: 'مشروع تجريبي وترفيهي.',
  somethingWrong: 'حدث خطأ', unexpectedError: 'واجهت الصفحة خطأ غير متوقع. يمكنك العودة للرئيسية والمحاولة مجددًا بأمان.', backHome: 'العودة للرئيسية',
  navigation: 'التنقل الرئيسي', openMenu: 'فتح القائمة', closeMenu: 'إغلاق القائمة', language: 'اللغة', skipContent: 'انتقل إلى المحتوى', slide: 'الانتقال إلى الشريحة {{number}}', previousSlide: 'العنوان السابق', nextSlide: 'العنوان التالي',
  quickView: 'معلومات سريعة', viewingProgress: 'تقدم المشاهدة',
};

const saved = localStorage.getItem('peakflix-language');
const browserLanguage = navigator.language?.toLowerCase().startsWith('ar') ? 'ar' : 'en';
const initialLanguage = saved === 'ar' || saved === 'en' ? saved : browserLanguage;

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar } },
  lng: initialLanguage,
  fallbackLng: 'en',
  supportedLngs: ['en', 'ar'],
  interpolation: { escapeValue: false },
});

export default i18n;
