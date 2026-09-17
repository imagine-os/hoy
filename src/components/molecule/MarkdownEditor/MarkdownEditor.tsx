import { useId } from 'react';
import ReactMarkdown from 'react-markdown';
import './MarkdownEditor.css';

export interface MarkdownEditorProps {
  value: string;
  onChange: (next: string) => void;
  /** Label above the textarea (the field's own label lives outside). */
  editLabel: string;
  previewLabel: string;
  placeholder?: string;
  disabled?: boolean;
  /** Empty-preview copy, so the right column is never a blank box. */
  emptyPreview?: string;
  rows?: number;
}

/**
 * Markdown with a live preview side by side: the body editor of M-02a (articles) and anywhere else
 * long copy is written. Stacks to one column below 900 px, and the preview renders with the same
 * `react-markdown` the reader's page uses, so what is written is what ships.
 */
export function MarkdownEditor({ value, onChange, editLabel, previewLabel, placeholder, disabled, emptyPreview, rows = 14 }: MarkdownEditorProps) {
  const id = useId();
  return (
    <div className="adm-md mdedit">
      <div className="stack-sm">
        <label className="eyebrow" htmlFor={id}>{editLabel}</label>
        <textarea id={id} className="input" rows={rows} value={value} placeholder={placeholder} disabled={disabled} onChange={(e) => onChange(e.target.value)} spellCheck />
        <span className="xs muted">{value.trim().split(/\s+/).filter(Boolean).length} · {value.length}</span>
      </div>
      <div className="stack-sm">
        <span className="eyebrow">{previewLabel}</span>
        <div className="adm-md-preview prose mdedit-preview">
          {value.trim() ? <ReactMarkdown>{value}</ReactMarkdown> : <p className="muted small">{emptyPreview ?? '—'}</p>}
        </div>
      </div>
    </div>
  );
}
