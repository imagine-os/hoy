import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useI18n } from '../../../i18n/I18nProvider';
import { useTable } from '../../../data/DataContext';
import { formatDate } from '../../../i18n/format';
import type { BaseRow } from '../../../data/schema';
import { PageHead, SiteShell } from '../SiteShell';

interface LegalRow extends BaseRow { kind: string; version: string; title: string; body_md: string; published_at: string | null }

/** A-06 — versioned legal documents from `legal_documents`. */
export function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const { t, lang } = useI18n();
  const { rows } = useTable<LegalRow>('legal_documents', { where: { kind } });
  const doc = rows[0];
  return (
    <SiteShell>
      <PageHead title={t(kind === 'terms' ? 'site.legal.terms' : 'site.legal.privacy')} body={doc ? t('site.legal.updated', { date: formatDate(doc.published_at ?? doc.updated_at, lang, { dateStyle: 'long' }), v: doc.version }) : undefined} />
      <section className="container site-section legal-body prose" style={{ paddingTop: 0 }}>
        <p className="muted small">{t('site.legal.draft')}</p>
        {doc && <ReactMarkdown>{doc.body_md}</ReactMarkdown>}
        <hr />
        <p className="small"><Link to={kind === 'terms' ? '/site/legal/privacy' : '/site/legal/terms'}>{t(kind === 'terms' ? 'site.legal.privacy' : 'site.legal.terms')} →</Link></p>
      </section>
    </SiteShell>
  );
}
