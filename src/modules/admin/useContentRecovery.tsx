import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { assertContentActor, type ContentActor } from './contentRecovery';
import { Button } from '../../components/atom/Button/Button';
import { refusalCopy } from '../../data/companyos/refusals';
import { definiteRefusal, refusalText } from './timetableSave';

/** Retains the exact failed operation and nonce, including an uncertain acknowledgement. */
export function useContentRecovery() {
  const { bi, t, lang } = useI18n();
  const { user, role } = useSession();
  const actorRef = useRef<ContentActor>({ id: user.id, role });
  actorRef.current = { id: user.id, role };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const currentActor = useCallback(() => { if (!mounted.current) throw Error('content_context_changed'); return { ...actorRef.current }; }, []);
  const lock = useRef(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const pending = useRef<null | { action: (id: string) => Promise<void>; id: string; actor: ContentActor }>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState<false | 'save' | 'context' | 'later' | 'refused'>(false);
  const [refusal, setRefusal] = useState<unknown>(null);
  useEffect(() => { if (error) alertRef.current?.focus(); }, [error]);
  const execute = async () => {
    if (lock.current || !pending.current) return false;
    lock.current = true; setBusy(true); setError(false);
    try { assertContentActor(pending.current.actor, currentActor()); await pending.current.action(pending.current.id); pending.current = null; return true; }
    catch (failure) {
      const code = failure instanceof Error ? failure.message : '';
      // Refused before anything was sent (production, until Wave 3): nothing to retry.
      if (code === 'content_later') { pending.current = null; setError('later'); return false; }
      // Lane Y5: a definite refusal (Company OS answered 4xx, or the timetable check refused before sending): nothing
      // was saved and the same request won't change that, so show its code's copy, not a retry. The draft stays.
      const refused = definiteRefusal(failure);
      // Review round 2: the line comes from the failure itself, so a room clash names the class and a remedy that works.
      if (refused) { pending.current = null; setRefusal(failure); setError('refused'); return false; }
      setError(code === 'content_context_changed' ? 'context' : 'save'); return false;
    }
    finally { lock.current = false; setBusy(false); }
  };
  const run = (action: (id: string) => Promise<void>) => {
    if (lock.current || pending.current) return Promise.resolve(false);
    pending.current = { action, id: crypto.randomUUID(), actor: currentActor() };
    return execute();
  };
  const notice = error === 'later' || error === 'refused' ? <div ref={alertRef} tabIndex={-1} role="alert" className="stack-sm"><p>{error === 'later' ? refusalCopy('content_later', lang) : refusalText(refusal, lang)}</p><Button variant="ghost" onClick={() => setError(false)}>{t('core.common.close')}</Button></div> : error && <div ref={alertRef} tabIndex={-1} role="alert" className="stack-sm"><p>{bi(error === 'context' ? { es: 'La sesión cambió. Se conserva tu borrador. Vuelve al usuario y rol originales para reintentar, o cancela y vuelve a abrir el editor.', en: 'The session changed. Your draft is preserved. Return to the original user and role to retry, or cancel and reopen the editor.' } : { es: 'No se confirmó el cambio. Se conserva tu borrador. Reintenta la misma operación; si los datos cambiaron, cierra y vuelve a abrir para revisarlos.', en: 'The change was not confirmed. Your draft is preserved. Retry the same operation; if the data changed, close and reopen to review it.' })}</p><Button variant="secondary" disabled={busy} onClick={() => execute()}>{t('core.common.retry')}</Button><Button variant="ghost" disabled={busy} onClick={() => { pending.current = null; setError(false); }}>{t('core.common.cancel')}</Button></div>;
  return { run, busy, blocked: busy || !!error, notice, currentActor };
}
