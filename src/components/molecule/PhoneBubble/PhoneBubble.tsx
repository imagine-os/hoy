import type { ReactNode } from 'react';
import './PhoneBubble.css';

export interface PhoneBubbleProps {
  /** Message body; `{{1}}` / `{{first_name}}` variables are highlighted unless `vars` resolves them. */
  text: string;
  vars?: Record<string, string>;
  time?: string;
  from?: 'business' | 'user';
  /** One-tap button under the bubble (Meta CTA). */
  cta?: string;
  /** Show the phone chrome with this header (business name). */
  header?: string;
  /** Preview marked as undeliverable (opt-out, template not approved). */
  undeliverable?: string;
  children?: ReactNode;
}

/** Splits `{{var}}` tokens; resolved ones become plain text, unresolved ones a highlighted mark. */
export function renderVars(text: string, vars: Record<string, string> = {}): ReactNode[] {
  return text.split(/(\{\{\s*[\w.]+\s*\}\})/g).map((part, i) => {
    const m = part.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
    if (!m) return part;
    const v = vars[m[1]];
    return v != null ? <span key={i} className="phonebubble-resolved">{v}</span> : <mark key={i} className="phonebubble-var">{part}</mark>;
  });
}

/** WhatsApp-style bubble, optionally inside a phone frame. Used to preview templates and automations. */
export function PhoneBubble({ text, vars, time, from = 'business', cta, header, undeliverable, children }: PhoneBubbleProps) {
  const bubble = (
    <div className={`phonebubble phonebubble-${from} ${undeliverable ? 'is-undeliverable' : ''}`}>
      <p className="phonebubble-text">{renderVars(text, vars)}</p>
      {time && <span className="phonebubble-time">{time}</span>}
      {cta && <div className="phonebubble-cta">{cta}</div>}
    </div>
  );
  if (!header) return bubble;
  return (
    <div className="phoneframe" role="img" aria-label={header}>
      <div className="phoneframe-head"><span className="phoneframe-dot" aria-hidden /><span className="phoneframe-title">{header}</span></div>
      <div className="phoneframe-body">
        {undeliverable && <div className="phoneframe-warn">{undeliverable}</div>}
        {bubble}
        {children}
      </div>
    </div>
  );
}
