import { useLang } from '../../../i18n/I18nProvider';
import './LangToggle.css';

/** ES / EN segmented switch. Persists in localStorage via I18nProvider. */
export function LangToggle({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`langtoggle langtoggle-${size}`} role="group" aria-label="Idioma / Language">
      {(['es', 'en'] as const).map((l) => (
        <button key={l} type="button" className={lang === l ? 'is-active' : ''} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}
