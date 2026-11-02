import { formatDate } from '../../i18n/format';
import type { Lang } from '../../i18n/types';
import type { LotListItem } from '../../components/molecule/LotList/LotList';
import type { LotLine } from './offers';

type T = (key: string, vars?: Record<string, string | number>) => string;
/** Dates carry the year: a lot can run into the next one. */
const DATE: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };

/** PRO-06: the live lots as LotList lines: the source, then the classes left and the expiry, or "no expiry". */
export function lotItems(lots: LotLine[], t: T, lang: Lang): LotListItem[] {
  return lots.map((l) => {
    const left = t(`customer.lot.left.${l.left === 1 ? 'one' : 'other'}`, { n: l.left });
    const until = l.frozenUntil ? t('customer.lot.frozen', { date: formatDate(l.frozenUntil, lang, DATE) })
      : l.expires ? t('customer.lot.expires', { date: formatDate(l.expires, lang, DATE) }) : t('customer.lot.noExpiry');
    return { id: l.id, source: l.source, title: t(`customer.lot.source.${l.source}`), detail: `${left} · ${until}` };
  });
}
