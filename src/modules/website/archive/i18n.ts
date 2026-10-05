import { useI18n as useCurrentI18n } from '../../../i18n/I18nProvider';
import { strings } from './strings';
/** Old editorial copy, with the shared current language controls and safe current-offer CTAs. */
export function useI18n() {
  const current = useCurrentI18n();
  return { ...current, t: (key: string, vars?: Record<string, string | number>) => {
    if (['site.plans.select', 'site.plans.choose'].includes(key)) return current.t('site.archive.currentPlans');
    if (key === 'site.today.empty') return current.t('site.archive.schedule');
    const value = strings[key];
    if (!value) return current.t(key, vars);
    let text = current.lang === 'en' ? value.en ?? value.es : value.es;
    if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
    return text;
  } };
}
