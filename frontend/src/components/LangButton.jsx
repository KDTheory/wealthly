// Tiny FR/EN toggle. Lives in the sidebar utilities + mobile header so the
// language is always one click away — same chrome as the eye/logout icons.
import { useTranslation } from 'react-i18next';

export function LangButton() {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || 'fr').slice(0, 2);
  const next = current === 'fr' ? 'en' : 'fr';
  return (
    <button
      className="lang-btn"
      onClick={() => i18n.changeLanguage(next)}
      title={current === 'fr' ? 'Switch to English' : 'Passer en français'}
      aria-label="Change language"
    >
      <span className={`lang-btn-side ${current === 'fr' ? 'on' : ''}`}>FR</span>
      <span className="lang-btn-sep">·</span>
      <span className={`lang-btn-side ${current === 'en' ? 'on' : ''}`}>EN</span>
    </button>
  );
}
