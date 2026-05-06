// ============================================================================
// i18n bootstrap — react-i18next + plain JSON resources.
//
// Foundation only for now: navigation labels, Dashboard section titles,
// Settings labels and the Import CSV wizard. The rest of the UI is gradually
// migrated as we touch each view.
//
// Language preference lives in localStorage under `wealthly:lang` and is
// read on init. Defaults to `fr`. Switch via i18n.changeLanguage('en').
// ============================================================================
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from './locales/fr/translation.json';
import en from './locales/en/translation.json';

const STORAGE_KEY = 'wealthly:lang';
const SUPPORTED = ['fr', 'en'];

function pickInitialLang() {
  if (typeof window === 'undefined') return 'fr';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved)) return saved;
  } catch {}
  // Fall back to the browser language if it's one we support, otherwise FR.
  const browser = (navigator.language || 'fr').slice(0, 2).toLowerCase();
  return SUPPORTED.includes(browser) ? browser : 'fr';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: pickInitialLang(),
    fallbackLng: 'fr',
    interpolation: { escapeValue: false }, // React already escapes
    react: { useSuspense: false },
  });

// Persist any language change so the choice survives reloads.
i18n.on('languageChanged', (lng) => {
  try { localStorage.setItem(STORAGE_KEY, lng); } catch {}
  // Reflect on <html lang="…"> so screen readers + browser features pick it up.
  if (typeof document !== 'undefined') document.documentElement.lang = lng;
});

if (typeof document !== 'undefined') document.documentElement.lang = i18n.language;

export default i18n;
export const SUPPORTED_LANGS = SUPPORTED;
