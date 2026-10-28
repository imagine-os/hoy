import { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '../DataContext';
import { useLang } from '../../i18n/I18nProvider';
import { refusalCopy } from './refusals';
import { newIdempotencyKey, refusalCode } from './transport';

type Watchable = { watch?: (tables: string[]) => () => void };

/**
 * Contract §1: live screens (schedule, check-in, pending payments) poll every 20 s while mounted; nothing else polls.
 * Pass the tables the screen shows; their `useTable` / `useRow` hooks refetch on every poll. No-op on the review build.
 */
export function useLiveUpdates(tables: string[]): void {
  const data = useData() as unknown as Watchable;
  const key = tables.join('|');
  useEffect(() => (data.watch ? data.watch(key ? key.split('|') : []) : undefined), [data, key]);
}

/**
 * One `Idempotency-Key` per user action (ADR 0040): the same key on every retry of this submit, a new one after it
 * succeeded or the form changed. Pass `key` to `data.atomic(fn, { idempotencyKey: key })`; call `done()` on success.
 */
export function useActionKey(): { key: string; done: () => void } {
  const [key, setKey] = useState(newIdempotencyKey);
  const done = useCallback(() => setKey(newIdempotencyKey()), []);
  return { key, done };
}

/** The refusal copy (rule C7) for a thrown error, in the current language; unknown codes get the generic line with the code. */
export function useRefusal(): (error: unknown) => string {
  const { lang } = useLang();
  const langRef = useRef(lang);
  langRef.current = lang;
  return useCallback((error: unknown) => refusalCopy(refusalCode(error), langRef.current), []);
}
