import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('English-only interface', () => {
  it.each(['nl-NL', 'sv-SE', 'he-IL', 'ar-SA', 'tr-TR'])(
    'ignores browser language %s and saved preferences',
    async browser => {
      localStorage.setItem('i18nextLng', browser.split('-')[0]);
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue([browser]);
      document.documentElement.lang = 'he';
      document.documentElement.dir = 'rtl';
      const { default: i18n } = await import('./i18n');
      expect(i18n.resolvedLanguage).toBe('en');
      expect(Object.keys(i18n.options.resources ?? {})).toEqual(['en']);
      expect(i18n.t('result.title')).toBe('Secret stored securely');
      expect(document.documentElement.lang).toBe('en');
      expect(document.documentElement.dir).toBe('ltr');
    },
  );
});

describe('plural forms', () => {
  it.each([
    ['en', 1, '1 secret waiting to be collected'],
    ['en', 2, '2 secrets waiting to be collected'],
  ])('%s renders count %i', async (language, count, expected) => {
    const { default: i18n } = await import('./i18n');
    expect(i18n.t('header.requestsWithCount', { lng: language, count })).toBe(
      expected,
    );
  });
});
