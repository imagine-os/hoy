import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { Button } from '../../../components/atom/Button/Button';
import { Card } from '../../../components/molecule/Card/Card';
import { Accordion } from '../../../components/molecule/Accordion/Accordion';
import { faqPages } from '../content';
import { PageHead, waLink } from '../ui';

/** C-14 / C-15 FAQ — two pages so the accordion never becomes a scroll of thirty open questions. */
export function FaqPage({ page }: { page: 1 | 2 }) {
  const { t, bi } = useI18n();
  const sections = faqPages[page - 1];
  return (
    <div className="container page cust-page">
      <PageHead back={page === 1 ? '/app/more' : '/app/faq'} title={t('customer.faq.title')} sub={t('customer.faq.page', { n: page, total: faqPages.length })} eyebrow={`C-1${page === 1 ? 4 : 5}`} />
      <div className="stack">
        {sections.map((s) => (
          <section key={s.id} className="stack-sm">
            <div><h2 className="cust-h2">{bi(s.title)}</h2><p className="small muted">{bi(s.lead)}</p></div>
            <Accordion items={s.items.map((q) => ({ id: q.id, question: bi(q.q), answer: <>{bi(q.a)}{/planes|plans|precio|price|cuesta|cost/i.test(bi(q.a)) && <> <Link to="/app/plans">{t('customer.faq.plansLink')} →</Link></>}</> }))} />
          </section>
        ))}
        {page === 1
          ? <Link to="/app/faq/2"><Button block variant="secondary">{t('customer.faq.next')} →</Button></Link>
          : <Card tone="highlight" className="row-between wrap"><span className="small">{t('customer.faq.concierge')}</span><a href={waLink(tenant.contact.whatsapp, t('customer.more.whatsapp.text', { name: '' }))} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary">WhatsApp →</Button></a></Card>}
      </div>
    </div>
  );
}
