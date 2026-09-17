import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_LABEL } from '../../auth/roles';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { RoleSwitcher } from '../../components/molecule/RoleSwitcher/RoleSwitcher';

export function NoAccessPage() {
  const { t, bi } = useI18n();
  const { role } = useSession();
  return (
    <div className="container page" style={{ maxWidth: 560 }}>
      <Card padding="lg" className="stack">
        <div className="noaccess-glyph" aria-hidden>⌾</div>
        <h1 className="noaccess-title">{t('core.noAccess.title')}</h1>
        <p className="muted">{t('core.noAccess.body', { role: bi(ROLE_LABEL[role]) })}</p>
        <RoleSwitcher />
        <div><Link to="/"><Button>{t('core.noAccess.cta')}</Button></Link></div>
      </Card>
    </div>
  );
}
