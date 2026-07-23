import { describe, expect, it } from 'vitest';
import { ar, en } from '.';
import { generatedTranslations } from './generated-translations';
import {
  detectQueryLocale,
  getTmdbLocale,
  isRtlLanguage,
  LANGUAGE_OPTIONS,
  normalizeLanguage,
} from './languages';

describe('language support', () => {
  it('offers 22 unique languages in alphabetical order', () => {
    expect(LANGUAGE_OPTIONS).toHaveLength(22);
    expect(new Set(LANGUAGE_OPTIONS.map(({ code }) => code)).size).toBe(22);
    const names = LANGUAGE_OPTIONS.map(({ englishName }) => englishName);
    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right, 'en')));
  });

  it('has a complete static interface translation for every language', () => {
    const englishKeys = Object.keys(en).sort();
    expect(Object.keys(ar).sort()).toEqual(englishKeys);
    for (const translation of Object.values(generatedTranslations)) {
      expect(Object.keys(translation).sort()).toEqual(englishKeys);
      expect(Object.values(translation).every((value) => value.trim().length > 0)).toBe(true);
      expect(translation.resultsCount).toContain('{{count}}');
      expect(translation.slide).toContain('{{number}}');
    }
  });

  it('normalizes browser locales and maps them to TMDB locales', () => {
    expect(normalizeLanguage('zh-Hans-CN')).toBe('zh');
    expect(normalizeLanguage('fil-PH')).toBe('fil');
    expect(normalizeLanguage('tl-PH')).toBe('fil');
    expect(getTmdbLocale('pt')).toBe('pt-BR');
    expect(getTmdbLocale('pa')).toBe('pa-IN');
  });

  it('uses RTL only for Arabic and Persian', () => {
    expect(isRtlLanguage('ar')).toBe(true);
    expect(isRtlLanguage('fa')).toBe(true);
    expect(isRtlLanguage('bn')).toBe(false);
  });

  it('detects the major non-Latin search scripts', () => {
    expect(detectQueryLocale('砂の惑星')).toBe('ja-JP');
    expect(detectQueryLocale('듄')).toBe('ko-KR');
    expect(detectQueryLocale('Дюна')).toBe('ru-RU');
    expect(detectQueryLocale('تل‌ماسه')).toBe('fa-IR');
    expect(detectQueryLocale('டூன்')).toBe('ta-IN');
    expect(detectQueryLocale('沙丘')).toBe('zh-CN');
  });
});
