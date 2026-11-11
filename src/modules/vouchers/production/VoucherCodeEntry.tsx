import { useRef, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useData } from '../../../data/DataContext';
import { Button } from '../../../components/atom/Button/Button';
import { Input } from '../../../components/atom/Input/Input';
import { Field } from '../../../components/molecule/Field/Field';
import { Notice } from '../../../components/molecule/Notice/Notice';
import { enterCode } from './codeEntry';
import { isCode, normalizeCode, type RedeemedLot } from './model';

export interface VoucherCodeEntryProps {
  /** Called once the classes are on the balance (after `reloadBalance`), with the lot the code made. */
  onRedeemed?: (lot: RedeemedLot) => void;
  /** Reloads whatever shows the balance. Optional: the provider already refetches every subscribed table after a write. */
  reloadBalance?: () => unknown | Promise<unknown>;
  /** A code to start with (for example one carried in a link). */
  initialCode?: string;
}

/**
 * Hoy 12 Nov (D5): "¿Tienes un código?" for the app checkout. Self-contained: it brings its own title, field, button,
 * success note and refusal words (es and en), so the page only places it and reacts to `onRedeemed`.
 */
export function VoucherCodeEntry({ onRedeemed, reloadBalance, initialCode = '' }: VoucherCodeEntryProps) {
  const { t } = useI18n();
  const data = useData();
  const [code, setCode] = useState(() => normalizeCode(initialCode).slice(0, 8));
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<RedeemedLot | null>(null);
  const [refusal, setRefusal] = useState<{ key: string; code: string | null } | null>(null);
  const key = useRef(crypto.randomUUID()), lock = useRef(false);
  const valid = isCode(code);
  const submit = async () => {
    if (!valid || lock.current) return;
    lock.current = true; setBusy(true); setRefusal(null); setDone(null);
    try {
      const out = await enterCode({ data, code, key: key.current, reloadBalance, onRedeemed });
      if (out.ok) { setDone(out.lot); setCode(''); key.current = crypto.randomUUID(); }
      else { setRefusal({ key: out.key, code: out.code }); if (!out.keepKey) key.current = crypto.randomUUID(); }
    } finally { lock.current = false; setBusy(false); }
  };
  const classes = done?.quantity ?? 0;
  return (
    <section className="stack-sm" aria-labelledby="voucher-code-entry">
      <h3 id="voucher-code-entry">{t('vouchers.cos.entry.title')}</h3>
      <Field label={t('vouchers.cos.entry.label')} hint={t('vouchers.cos.entry.hint')} error={code && !valid ? t('vouchers.cos.err.code') : undefined}>
        {(id) => <Input id={id} value={code} autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12}
          onChange={(e) => { const next = normalizeCode(e.target.value); if (next !== code) { setCode(next); key.current = crypto.randomUUID(); } setRefusal(null); setDone(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void submit(); } }} />}
      </Field>
      {refusal && (
        <Notice tone="danger" title={t(`${refusal.key}.title`)}>
          {t(`${refusal.key}.body`)}{refusal.key.endsWith('generic') && refusal.code ? ` (${refusal.code})` : ''}
        </Notice>
      )}
      {done && <Notice tone="success">{t('vouchers.cos.entry.done', { classes: t(classes === 1 ? 'vouchers.cos.class1' : 'vouchers.cos.classes', { n: classes }) })}</Notice>}
      <Button type="button" variant="secondary" loading={busy} disabled={!valid || busy} onClick={submit}>{t('vouchers.cos.entry.cta')}</Button>
    </section>
  );
}
