import { useTranslation } from 'react-i18next';
import { normalizeLanguage } from '../i18n/languages';
import type { MediaItem } from '../types/media';

export function useLocalizedMedia() {
  const { i18n } = useTranslation();
  const currentLang = normalizeLanguage(i18n.resolvedLanguage);

  return {
    currentLang,
    ar: currentLang === 'ar',
    title: (item: MediaItem) => currentLang === 'ar'
      ? item.titleAr
      : item.localizedLanguage === currentLang && item.localizedTitle ? item.localizedTitle : item.title,
    description: (item: MediaItem) => currentLang === 'ar'
      ? item.descriptionAr
      : item.localizedLanguage === currentLang && item.localizedDescription ? item.localizedDescription : item.description,
  };
}
