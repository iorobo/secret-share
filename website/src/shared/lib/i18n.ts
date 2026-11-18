import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';

i18n.on('languageChanged', () => {
  document.documentElement.lang = 'en';
  document.documentElement.dir = 'ltr';
});

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  supportedLngs: ['en'],
  fallbackLng: 'en',
  debug: false,
  interpolation: { escapeValue: false },
});

export default i18n;
