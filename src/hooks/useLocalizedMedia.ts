import { useTranslation } from 'react-i18next';
import type { MediaItem } from '../types/media';

export function useLocalizedMedia() {
  const { i18n } = useTranslation();
  // اللغة الحالية (مثلاً 'ar', 'en', 'es', 'ja')
  const currentLang = i18n.resolvedLanguage || 'en'; 

  return {
    currentLang,
    ar: currentLang === 'ar',
    title: (item: MediaItem) => {
      // إذا كانت اللغة عربي بنجيب العنوان العربي، غير هيك بنجيب العنوان الأساسي
      return currentLang === 'ar' ? item.titleAr : item.title;
    },
    description: (item: MediaItem) => {
      return currentLang === 'ar' ? item.descriptionAr : item.description;
    },
  };
}