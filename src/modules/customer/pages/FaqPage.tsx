import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useContact } from '../../admin/settings';
import { Button } from '../../../components/atom/Button/Button';
import { Card } from '../../../components/molecule/Card/Card';
import { Accordion } from '../../../components/molecule/Accordion/Accordion';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { useFaq } from '../hooks';
import { PageHead, waLink } from '../ui';

/** C-14 / C-15 FAQ — questions come from `faq_entries`, grouped by section, two pages so the accordion stays short. */
export function FaqPage({ page }: { page: 1 | 2 }) {
  const { t, bi } = useI18n();
  const contact = useContact();
  const { groups, totalPages, loading } = useFaq(page);
  return (
    <div className="container page cust-page">
      <PageHead back={page === 1 ? '/app/more' : '/app/faq'} title={t('customer.faq.title')} sub={t('customer.faq.page', { n: page, total: totalPages })} eyebrow={`C-1${page === 1 ? 4 : 5}`} />
      <div className="stack">
        {loading && groups.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
        {!loading && groups.length === 0 && <EmptyState icon="?" title={t('customer.faq.empty')} body={t('customer.faq.empty.body')} />}
        {groups.map((s) => (
          <section key={s.key} className="stack-sm">
            <div><h2 className="cust-h2">{bi(s.title)}</h2><p className="small muted">{bi(s.lead)}</p></div>
            <Accordion items={s.items.map((q) => ({ id: q.id, question: bi(q.question), answer: <>{bi(q.answer)}{/planes|plans|precio|price|cuesta|cost/i.test(bi(q.answer)) && <> <Link to="/app/plans">{t('customer.faq.plansLink')} →</Link></>}</> }))} />
          </section>
        ))}
        {page === 1
          ? <Link to="/app/faq/2"><Button block variant="secondary">{t('customer.faq.next')} →</Button></Link>
          : <Card tone="highlight" className="row-between wrap"><span className="small">{t('customer.faq.concierge')}</span><a href={waLink(contact.whatsapp, t('customer.more.whatsapp.text', { name: '' }))} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary">WhatsApp →</Button></a></Card>}
      </div>
    </div>
  );
}
