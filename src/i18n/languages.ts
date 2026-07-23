export const LANGUAGE_OPTIONS = [
  { code: 'ar', name: 'العربية', englishName: 'Arabic', tmdb: 'ar-SA' },
  { code: 'bn', name: 'বাংলা', englishName: 'Bengali', tmdb: 'bn-BD' },
  { code: 'zh', name: '中文（普通话）', englishName: 'Chinese (Mandarin)', tmdb: 'zh-CN' },
  { code: 'nl', name: 'Nederlands', englishName: 'Dutch', tmdb: 'nl-NL' },
  { code: 'en', name: 'English', englishName: 'English', tmdb: 'en-US' },
  { code: 'fil', name: 'Filipino', englishName: 'Filipino', tmdb: 'tl-PH' },
  { code: 'fr', name: 'Français', englishName: 'French', tmdb: 'fr-FR' },
  { code: 'de', name: 'Deutsch', englishName: 'German', tmdb: 'de-DE' },
  { code: 'hi', name: 'हिन्दी', englishName: 'Hindi', tmdb: 'hi-IN' },
  { code: 'id', name: 'Bahasa Indonesia', englishName: 'Indonesian', tmdb: 'id-ID' },
  { code: 'it', name: 'Italiano', englishName: 'Italian', tmdb: 'it-IT' },
  { code: 'ja', name: '日本語', englishName: 'Japanese', tmdb: 'ja-JP' },
  { code: 'ko', name: '한국어', englishName: 'Korean', tmdb: 'ko-KR' },
  { code: 'fa', name: 'فارسی', englishName: 'Persian', tmdb: 'fa-IR' },
  { code: 'pt', name: 'Português', englishName: 'Portuguese', tmdb: 'pt-BR' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', tmdb: 'pa-IN' },
  { code: 'ru', name: 'Русский', englishName: 'Russian', tmdb: 'ru-RU' },
  { code: 'es', name: 'Español', englishName: 'Spanish', tmdb: 'es-ES' },
  { code: 'sv', name: 'Svenska', englishName: 'Swedish', tmdb: 'sv-SE' },
  { code: 'ta', name: 'தமிழ்', englishName: 'Tamil', tmdb: 'ta-IN' },
  { code: 'th', name: 'ไทย', englishName: 'Thai', tmdb: 'th-TH' },
  { code: 'tr', name: 'Türkçe', englishName: 'Turkish', tmdb: 'tr-TR' },
] as const;

export type LanguageCode = typeof LANGUAGE_OPTIONS[number]['code'];

const LANGUAGE_CODES = new Set<string>(LANGUAGE_OPTIONS.map(({ code }) => code));
const TMDB_LOCALES = Object.fromEntries(LANGUAGE_OPTIONS.map(({ code, tmdb }) => [code, tmdb]));
const RTL_LANGUAGES = new Set<LanguageCode>(['ar', 'fa']);

export function normalizeLanguage(value?: string | null): LanguageCode {
  const normalized = (value || '').toLowerCase().replace('_', '-');
  if (normalized.startsWith('zh')) return 'zh';
  if (normalized === 'tl' || normalized.startsWith('tl-') || normalized.startsWith('fil')) return 'fil';
  const base = normalized.split('-')[0];
  return LANGUAGE_CODES.has(base) ? base as LanguageCode : 'en';
}

export function getPreferredLanguage(): LanguageCode {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('peakflix-language') : null;
  if (stored && LANGUAGE_CODES.has(stored)) return stored as LanguageCode;
  return normalizeLanguage(typeof navigator !== 'undefined' ? navigator.language : 'en');
}

export function getTmdbLocale(language?: string | null): string {
  return TMDB_LOCALES[normalizeLanguage(language)] || 'en-US';
}

export function isRtlLanguage(language?: string | null): boolean {
  return RTL_LANGUAGES.has(normalizeLanguage(language));
}

export function detectQueryLocale(query: string): string | undefined {
  if (/[\u3040-\u30ff]/u.test(query)) return 'ja-JP';
  if (/[\uac00-\ud7af]/u.test(query)) return 'ko-KR';
  if (/[\u4e00-\u9fff]/u.test(query)) return 'zh-CN';
  if (/[\u0400-\u04ff]/u.test(query)) return 'ru-RU';
  if (/[\u0980-\u09ff]/u.test(query)) return 'bn-BD';
  if (/[\u0b80-\u0bff]/u.test(query)) return 'ta-IN';
  if (/[\u0a00-\u0a7f]/u.test(query)) return 'pa-IN';
  if (/[\u0e00-\u0e7f]/u.test(query)) return 'th-TH';
  if (/[\u0900-\u097f]/u.test(query)) return 'hi-IN';
  if (/[\u067e\u0686\u0698\u06af\u06a9\u06cc\u200c]/iu.test(query)) return 'fa-IR';
  if (/[\u0600-\u06ff]/u.test(query)) return 'ar-SA';
  return undefined;
}
