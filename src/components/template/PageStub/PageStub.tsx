import type { PageSpec } from '../../../specs/types';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { Card } from '../../molecule/Card/Card';
import { Badge } from '../../atom/Badge/Badge';
import { Button } from '../../atom/Button/Button';
import { openInspector } from '../../../dev/inspectorBus';
import './PageStub.css';

/** Placeholder page for a canvas code that is specified but not built yet. */
export function PageStub({ spec }: { spec: PageSpec }) {
  const { bi, t } = useI18n();
  const { devMode } = useSession();
  return (
    <div className="container page">
      <Card className="stub" padding="lg">
        <div className="row wrap"><code className="stub-code">{spec.code}</code><Badge tone="warn">{t('core.stub.comingSoon')}</Badge></div>
        <h1 className="stub-title">{bi(spec.name)}</h1>
        <p className="muted">{bi(spec.purpose)}</p>
        {spec.layout.length > 0 && (
          <div className="stub-layout">
            <div className="eyebrow">Layout</div>
            <ol>{spec.layout.map((l) => <li key={l}>{l}</li>)}</ol>
          </div>
        )}
        <p className="small muted">{t('core.stub.body')}</p>
        {devMode && <div><Button variant="secondary" size="sm" onClick={() => openInspector()}>{t('core.stub.openSpec')}</Button></div>}
      </Card>
    </div>
  );
}
