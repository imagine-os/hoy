import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '../../atom/Badge/Badge';
import { Chip } from '../../atom/Chip/Chip';
import './LegalDocument.css';

export interface LegalVersionRef {
  id: string;
  /** Chip label, already localised by the caller (e.g. "v1.1 · borrador"). */
  label: string;
}

export interface LegalDocumentProps {
  /** Resolved title for the current language. */
  title: string;
  /** One-line summary under the title. */
  summary?: string;
  /** Markdown body with every {{token}} already resolved. */
  body: string;
  version: string;
  status: 'draft' | 'published';
  /** Human-readable effective date, already formatted. */
  effectiveLabel: string;
  /** Label for the status badge ("vigente" / "borrador"). */
  statusLabel: string;
  /** The counsel-review notice; always shown, because no version is lawyer-reviewed yet. */
  notice?: ReactNode;
  /** Shown only when more than one version exists. */
  versions?: LegalVersionRef[];
  activeVersionId?: string;
  onPickVersion?: (id: string) => void;
  versionsLabel?: string;
  /** "Accepted on …" line for the in-app copy of a document the member signed. */
  accepted?: ReactNode;
  /** Cross-links to the sibling documents. */
  footer?: ReactNode;
}

/**
 * A-06 — one legal document, rendered the same way on the public site and inside the app:
 * title, version and effective date, the counsel-review notice, the markdown body, an optional
 * version switcher and an optional acceptance receipt.
 */
export function LegalDocument({ title, summary, body, version, status, effectiveLabel, statusLabel, notice, versions, activeVersionId, onPickVersion, versionsLabel, accepted, footer }: LegalDocumentProps) {
  const many = (versions?.length ?? 0) > 1;
  return (
    <article className="legaldoc">
      <header className="legaldoc-head">
        <h1 className="legaldoc-title">{title}</h1>
        <div className="row wrap legaldoc-meta">
          <Badge tone={status === 'published' ? 'success' : 'warn'}>{statusLabel}</Badge>
          <span className="mono xs legaldoc-ver">v{version}</span>
          <span className="xs muted">{effectiveLabel}</span>
        </div>
        {summary && <p className="muted small legaldoc-sum">{summary}</p>}
      </header>
      {accepted && <div className="legaldoc-accepted small">{accepted}</div>}
      {notice && <div className="legaldoc-notice small">{notice}</div>}
      {many && (
        <div className="row wrap legaldoc-versions" role="tablist" aria-label={versionsLabel}>
          {versionsLabel && <span className="xs muted">{versionsLabel}</span>}
          {versions!.map((v) => (
            <Chip key={v.id} selected={v.id === activeVersionId} role="tab" aria-selected={v.id === activeVersionId} onClick={onPickVersion ? () => onPickVersion(v.id) : undefined}>{v.label}</Chip>
          ))}
        </div>
      )}
      <div className="prose legaldoc-body">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
      {footer && <footer className="legaldoc-foot small">{footer}</footer>}
    </article>
  );
}

/** Values the {{token}}s in a legal body resolve against. */
export interface LegalTokens { tenant: Record<string, string | number>; policy: Record<string, string | number> }

/**
 * Resolves `{{tenant.*}}` and `{{policy.*}}` in a legal body. Studio identity comes from
 * src/tenant/tenant.ts + M-08, policy numbers from usePolicy(), so the copy never repeats a number
 * that a screen can change. An unknown token is left visible as `⟨token⟩` rather than silently
 * dropped, the same way a missing i18n key behaves.
 */
export function resolveLegalTokens(body: string, tokens: LegalTokens): string {
  return body.replace(/\{\{(tenant|policy)\.([a-zA-Z]+)\}\}/g, (_m, ns: 'tenant' | 'policy', key: string) => {
    const v = tokens[ns][key];
    return v === undefined || v === null ? `⟨${ns}.${key}⟩` : String(v);
  });
}
