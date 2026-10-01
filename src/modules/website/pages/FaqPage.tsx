/**
 * W-10 — Preguntas frecuentes (0051).
 *
 * Contents
 *   1. Helpers — section number and title from the stored "01 · Clases y precios", plain text for search
 *   2. FaqPage — head, search, the index of sections, the sections, the closing contact card
 *
 * Every question comes from `faq_entries` (the same rows the app's C-14 / C-15 read, edited in M-02c), so the
 * website and the app always answer the same way. An answer that lists prices carries a `{{pricing:…}}` line and
 * renders a live table from src/tenant/pricing.ts (FaqAnswer → PriceTable).
 */
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useLayout } from '../../../layout/useLayout';
import { formatCOP } from '../../../i18n/format';
import { useContact, useWhatsappLink } from '../../admin/settings';
import { Accordion } from '../../../components/molecule/Accordion/Accordion';
import { FaqAnswer } from '../../../components/molecule/FaqAnswer/FaqAnswer';
import { itemsForFamilies } from '../../../components/molecule/PriceTable/PriceTable';
import { EmptyState } from '../../../components/molecule/EmptyState/EmptyState';
import { Icon } from '../../../components/atom/Icon/Icon';
import { PageHead, SiteShell } from '../SiteShell';
import { siteSpecs } from '../specs';
import { useFaqGroups } from '../hooks';
import { useFaqJsonLd } from '../jsonLd';
import '../faq.css';

// ── 1. Helpers ─────────────────────────────────────────────────────────────────────────────────────

/** "01 · Clases y precios" → { num: '01', title: 'Clases y precios' }; a title without a number keeps it whole. */
const splitTitle = (s: string) => {
  const m = /^(\d+)\s*·\s*(.+)$/.exec(s);
  return m ? { num: m[1], title: m[2] } : { num: '', title: s };
};

/** Lower-case, accent-free text, so "check in" finds "check-in" and "reembolso" finds "Reembolsos". */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ');

const DIRECTIVE = /\{\{\s*pricing:([^}]+?)\s*\}\}/g;

// ── 2. FaqPage ─────────────────────────────────────────────────────────────────────────────────────

export function FaqPage() {
  const { t, bi, lang } = useI18n();
  const { sections, isVisible } = useLayout(siteSpecs.faq);
  const { groups, loading } = useFaqGroups();
  const contact = useContact();
  // A question the FAQ does not answer is a support handoff (M-08a contacts, 0047).
  const wa = useWhatsappLink();
  const support = wa.resolve('support');
  const [query, setQuery] = useState('');

  // The price directive written out as words, for search and for the structured data.
  const plain = (text: string) => text.replace(DIRECTIVE, (_m, fams: string) => itemsForFamilies(fams).map((p) => `${bi(p.name)}: ${p.price == null ? '' : formatCOP(p.price, lang)}`).join('; '));

  const view = useMemo(() => {
    const q = fold(query).trim();
    return groups.map((g) => ({
      ...g,
      head: splitTitle(bi(g.title)),
      items: q ? g.items.filter((it) => fold(`${bi(it.question)} ${plain(bi(it.answer))}`).includes(q)) : g.items,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, query, lang]);
  const matches = view.reduce((n, g) => n + g.items.length, 0);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  useFaqJsonLd(useMemo(() => groups.flatMap((g) => g.items.map((it) => ({ question: bi(it.question), answer: plain(bi(it.answer)) }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groups, lang]));

  const SECTIONS: Record<string, () => ReactNode> = {
    PageHead: () => <PageHead eyebrow={t('site.faq.eyebrow')} title={t('site.faq.title')} body={t('site.faq.body', { n: total })} />,
    Search: () => (
      <section className="container faq-search-wrap" aria-label={t('site.faq.search')}>
        <label className="faq-search">
          <Icon name="search" size={20} />
          <span className="sr-only">{t('site.faq.search')}</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('site.faq.searchPh')} autoComplete="off" />
          {query && <button type="button" className="faq-search-clear" onClick={() => setQuery('')} aria-label={t('site.faq.clear')}><Icon name="close" size={18} /></button>}
        </label>
        <p className="faq-search-count small muted" role="status" aria-live="polite">{query ? t('site.faq.matches', { n: matches }) : t('site.faq.count', { n: total, groups: groups.length })}</p>
      </section>
    ),
    Groups: () => (
      <section className="container site-section faq-layout">
        <nav className="faq-index" aria-label={t('site.faq.index')}>
          <p className="eyebrow">{t('site.faq.index')}</p>
          <ol>
            {view.map((g) => (
              <li key={g.key}>
                <a href={`#faq-${g.key}`} onClick={(e) => { e.preventDefault(); document.getElementById(`faq-${g.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className={g.items.length ? undefined : 'is-empty'}>
                  <span className="faq-index-num">{g.head.num}</span>
                  <span className="faq-index-title">{g.head.title}</span>
                  <span className="faq-index-n" aria-label={t('site.faq.questions', { n: g.items.length })}>{g.items.length}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="faq-groups">
          {loading && groups.length === 0 && <EmptyState compact tone="loading" title={t('core.common.loading')} />}
          {!loading && query && matches === 0 && (
            <EmptyState icon="search" title={t('site.faq.none', { q: query })} body={t('site.faq.none.body')}
              action={<a href={wa.link('support', t('site.faq.wa.text', { q: query }))} target="_blank" rel="noreferrer" className="sanctuary-button">{t('site.faq.wa')}<Icon name="whatsapp" size={18} /></a>} />
          )}
          {view.filter((g) => g.items.length > 0).map((g, gi) => (
            <section key={g.key} id={`faq-${g.key}`} className="faq-group" aria-labelledby={`faq-${g.key}-h`}>
              <header className="faq-group-head">
                <span className="faq-group-num" aria-hidden>{g.head.num}</span>
                <div>
                  <h2 id={`faq-${g.key}-h`}>{g.head.title}</h2>
                  <p className="muted">{bi(g.lead)}</p>
                </div>
              </header>
              {/* A search opens every match; otherwise the first question ("¿Cuáles son las opciones?") starts open so the live prices show at once. */}
              <Accordion variant="editorial" single={false} defaultOpen={query ? g.items.map((it) => it.id) : gi === 0 && g.items[0] ? [g.items[0].id] : []}
                key={query ? `q-${query}` : 'all'}
                items={g.items.map((it) => ({ id: it.id, question: bi(it.question), answer: <FaqAnswer text={bi(it.answer)} /> }))} />
            </section>
          ))}
        </div>
      </section>
    ),
    Contact: () => (
      <section className="container site-section">
        <div className="faq-contact">
          <div className="faq-contact-copy">
            <p className="eyebrow">{t('site.faq.more.eyebrow')}</p>
            <h2>{t('site.faq.more.title')}</h2>
            <p>{t('site.faq.more.body')}</p>
          </div>
          <div className="faq-contact-actions">
            <a href={wa.link('support', t('site.faq.wa.plain'))} target="_blank" rel="noreferrer" className="sanctuary-button is-light">{t('site.faq.wa')}<Icon name="whatsapp" size={18} /></a>
            <a href={`mailto:${contact.email}`} className="faq-contact-link">{contact.email}</a>
            <Link to="/site/plans" className="faq-contact-link">{t('site.value.all')} →</Link>
            {support.note && <p className="xs faq-contact-note">{bi(support.note)}</p>}
          </div>
        </div>
      </section>
    ),
  };

  return (
    <SiteShell>
      {sections.filter(isVisible).map((name) => SECTIONS[name] ? <Fragment key={name}>{SECTIONS[name]()}</Fragment> : null)}
    </SiteShell>
  );
}

// Contents (again, for the reader who scrolled here first)
//   1. Helpers — splitTitle, fold, DIRECTIVE
//   2. FaqPage — PageHead · Search · Groups (index + sections) · Contact
