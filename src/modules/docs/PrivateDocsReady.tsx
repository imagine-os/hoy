import { useEffect, useState, type ReactNode } from 'react';
import { PRODUCTION_BUILD } from '../../config/launch';
import { useI18n } from '../../i18n/I18nProvider';
import { Notice } from '../../components/molecule/Notice/Notice';
import { Button } from '../../components/atom/Button/Button';
import { loadPrivateDocs, privateDocs, type PrivateDocsState } from './privateDocs';

/**
 * Production (lane Y6): the docs, manual and kanban pages render only once the gated pack has loaded, so their lazy
 * chunk (which reads it when it first evaluates) never sees an empty pack. A refusal or a failure shows a notice and
 * never the page; the server decides (server/docsGate.mjs), this only waits for its answer. Review: children at once.
 */
export function PrivateDocsReady({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<PrivateDocsState | 'loading'>(() => (!PRODUCTION_BUILD || privateDocs() ? 'ok' : 'loading'));
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!PRODUCTION_BUILD || privateDocs()) return;
    let alive = true;
    setState('loading');
    loadPrivateDocs().then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, [attempt]);
  if (state === 'ok') return <>{children}</>;
  if (state === 'loading') return <p className="muted small" data-private-docs="loading">{t('core.common.loading')}</p>;
  return (
    <div className="stack" data-private-docs={state}>
      <Notice tone={state === 'failed' || state === 'test-gate' ? 'warn' : 'danger'} title={t(`docs.private.${state}.title`)}
        action={state !== 'refused' ? <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>{t('docs.private.retry')}</Button> : undefined}>
        {t(`docs.private.${state}.body`)}
      </Notice>
    </div>
  );
}
