import type { MediaItem } from '../types/media';

const sampleVideo = 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
const trailer = 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export const media: MediaItem[] = [
  {
    id: 'silent-orbit', type: 'movie', title: 'Silent Orbit', titleAr: 'المدار الصامت',
    description: 'A lone engineer uncovers a signal that could rewrite humanity’s future.',
    descriptionAr: 'مهندس وحيد يكتشف إشارة قد تعيد كتابة مستقبل البشرية.',
    year: 2026, rating: 9.1, duration: '2h 08m', genre: ['Sci‑Fi', 'Thriller'], trending: true,
    poster: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=900&q=85',
    backdrop: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=90', trailer, video: sampleVideo,
  },
  {
    id: 'last-kingdom', type: 'series', title: 'The Last Kingdom', titleAr: 'المملكة الأخيرة',
    description: 'A fallen dynasty fights through betrayal to reclaim its name.',
    descriptionAr: 'سلالة ساقطة تقاتل وسط الخيانة لاستعادة اسمها.',
    year: 2025, rating: 8.8, duration: '3 Seasons', genre: ['Drama', 'Action'], trending: true, episodes: 24,
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=900&q=85',
    backdrop: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=90', trailer, video: sampleVideo,
  },
  {
    id: 'neon-blade', type: 'anime', title: 'Neon Blade', titleAr: 'نصل النيون',
    description: 'A street fighter inherits a forbidden weapon in a city ruled by machines.',
    descriptionAr: 'مقاتل شوارع يرث سلاحاً محرماً في مدينة تحكمها الآلات.',
    year: 2026, rating: 9.3, duration: '12 Episodes', genre: ['Anime', 'Cyberpunk'], trending: true, episodes: 12,
    poster: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85',
    backdrop: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2000&q=90', trailer, video: sampleVideo,
  },
  {
    id: 'istanbul-nights', type: 'turkish-series', title: 'Istanbul Nights', titleAr: 'ليالي إسطنبول',
    description: 'Two rival families are bound by a secret hidden beneath Istanbul.',
    descriptionAr: 'عائلتان متنافستان يجمعهما سر مخفي تحت إسطنبول.',
    year: 2025, rating: 8.6, duration: '18 Episodes', genre: ['Turkish', 'Romance'], trending: true, episodes: 18,
    poster: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=900&q=85',
    backdrop: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=2000&q=90', trailer, video: sampleVideo,
  },
  {
    id: 'red-room', type: 'turkish-drama', title: 'The Red Room', titleAr: 'الغرفة الحمراء',
    description: 'Every confession opens another door into a dangerous past.',
    descriptionAr: 'كل اعتراف يفتح باباً جديداً إلى ماضٍ خطير.',
    year: 2024, rating: 8.4, duration: '16 Episodes', genre: ['Drama', 'Mystery'], trending: true, episodes: 16,
    poster: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85',
    backdrop: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=90', trailer, video: sampleVideo,
  },
  {
    id: 'deep-blue', type: 'movie', title: 'Deep Blue', titleAr: 'الأزرق العميق',
    description: 'A diving team discovers a forgotten civilization below the ocean floor.',
    descriptionAr: 'فريق غوص يكتشف حضارة منسية تحت قاع المحيط.',
    year: 2024, rating: 8.1, duration: '1h 52m', genre: ['Adventure', 'Mystery'],
    poster: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=85',
    backdrop: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=90', trailer, video: sampleVideo,
  }
];
