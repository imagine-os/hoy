import { useI18n, useLang } from '../../../i18n/I18nProvider';
import './LangToggle.css';

/** ES / EN segmented switch. Persists in localStorage via I18nProvider. */
export function LangToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { lang, setLang } = useLang();
  const { t } = useI18n();
  return (
    <div className={`langtoggle langtoggle-${size}`} role="group" aria-label={t('core.lang.toggle')}>
      {(['es', 'en'] as const).map((l) => (
        <button key={l} type="button" className={lang === l ? 'is-active' : ''} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}
