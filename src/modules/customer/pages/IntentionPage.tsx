import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { useData, useTable } from '../../../data/DataContext';
import type { IntentionRow } from '../../../data/schema';
import { movements, type Movement } from '../../../design/tokens';
import { Card } from '../../../components/molecule/Card/Card';
import { PageHead } from '../ui';
import { dateKey } from '../../../i18n/format';


/** A-05 Daily intention — "How do you want to feel today?" sorts today's classes. */
export function IntentionPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const data = useData();
  const { user } = useSession();
  const { rows } = useTable<IntentionRow>('intentions', { where: { user_id: user.id, date: dateKey() } });
  const current = rows[0];
  const pick = async (mv: Movement) => {
    if (current) await data.update('intentions', current.id, { movement: mv });
    else await data.insert('intentions', { user_id: user.id, date: dateKey(), movement: mv });
    nav('/app');
  };
  const DESC: Record<Movement, string> = { enraiza: t('customer.intention.enraiza'), fluye: t('customer.intention.fluye'), arde: t('customer.intention.arde'), libera: t('customer.intention.libera') };
  return (
    <div className="container page cust-page">
      <PageHead back="/app" title={t('customer.home.intention.q')} sub={t('customer.home.intention.hint')} />
      <div className="stack">
        <div className="grid grid-2">
          {(Object.keys(movements) as Movement[]).map((mv) => (
            <Card key={mv} interactive onClick={() => pick(mv)} className={`cust-intention cust-intention-${mv} ${current?.movement === mv ? 'is-active' : ''}`} padding="lg">
              <span className={`classrow-dot mv-${mv}`} aria-hidden style={{ width: 14, height: 14 }} />
              <strong>{movements[mv].label}</strong>
              <span className="small muted">{DESC[mv]}</span>
            </Card>
          ))}
        </div>
        <p className="xs muted" style={{ textAlign: 'center' }}><Link to="/app">{t('customer.intention.skip')}</Link></p>
      </div>
    </div>
  );
}
