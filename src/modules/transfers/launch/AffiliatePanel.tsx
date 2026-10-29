import { useI18n } from '../../../i18n/I18nProvider';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Button } from '../../../components/atom/Button/Button';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { batch, CosError, refusalKey, type BatchOp } from './cos';
import { useAction, useCos, useLoad } from './useCos';

export interface MemberFacet { id: string; data: { person?: string; price_audience?: string | null } }

/** The member facet's price audience → the Santa María pack may be sold (the server enforces `audience_not_allowed`). */
export const affiliateOps = (member: MemberFacet, verified: boolean): BatchOp[] =>
  [{ op: 'update', entity: 'member', id: member.id, data: { price_audience: verified ? 'affiliate' : 'general' } }];

/** PR-05: shows whether the person is a verified Santa María member, and lets the desk set it (no import yet, J7). */
export function AffiliatePanel({ person, onChange }: { person: string; onChange?: (verified: boolean) => void }) {
  const { t } = useI18n();
  const cos = useCos();
  const { state, reload } = useLoad(async (c) => (await c.request<{ data: MemberFacet[] }>('POST', '/query', { entity: 'member', filter: { field: 'person', op: 'eq', value: person }, limit: 1 })).data[0] ?? null, [person]);
  const action = useAction();
  if (state.status !== 'ready') return state.status === 'error' ? <Notice tone="danger" action={<Button size="sm" onClick={reload}>{t('payLaunch.retry')}</Button>}>{t(refusalKey(state.code), { code: state.code })}</Notice> : null;
  const member = state.value;
  if (!member) return <Notice tone="warn">{t('payLaunch.affiliate.noMember')}</Notice>;
  const verified = member.data.price_audience === 'affiliate';
  const set = (next: boolean) => action.run(async (key) => {
    if (!cos) throw new CosError('disconnected');
    await batch(cos, affiliateOps(member, next), key);
    onChange?.(next); reload();
  });
  return <div className="stack-sm" data-testid="affiliate-panel">
    <strong>{t('payLaunch.affiliate.title')}</strong>
    <Badge tone={verified ? 'success' : 'warn'}>{t(verified ? 'payLaunch.affiliate.verified' : 'payLaunch.affiliate.unverified')}</Badge>
    <div className="row wrap">
      {verified
        ? <Button size="sm" variant="ghost" disabled={action.busy} onClick={() => void set(false)}>{t('payLaunch.affiliate.unset')}</Button>
        : <Button size="sm" variant="secondary" disabled={action.busy} onClick={() => void set(true)}>{t('payLaunch.affiliate.verify')}</Button>}
    </div>
    {action.error && <p role="alert">{t(refusalKey(action.error), { code: action.error })}</p>}
  </div>;
}
