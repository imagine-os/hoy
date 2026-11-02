import { useEffect, useState } from 'react';
import { useData } from '../../data/DataContext';
import type { DataProvider } from '../../data/types';
import { PRODUCTION_BUILD } from '../../config/launch';
import { cosOf, myPerson } from '../transfers/launch/cos';
import { affiliateFromMembers } from './offers';

/**
 * PRO-05: whether the signed-in customer's member facet has the affiliate `price_audience` (the desk sets it, PR-05), read
 * the way the transfer payment reads it (own person, then the member facet). `null` while unread or in the review build
 * (which shows every pack, unchanged); a failed read hides the affiliate pack. Display only: Company OS refuses a sale to
 * a non-affiliate (`audience_not_allowed`).
 */
export function useAffiliate(): boolean | null {
  const data = useData();
  const [answer, setAnswer] = useState<{ data: DataProvider; value: boolean } | null>(null);
  useEffect(() => {
    if (!PRODUCTION_BUILD) return;
    const cos = cosOf(data);
    if (!cos) return;
    let alive = true;
    (async () => {
      const person = await myPerson(cos);
      if (!person) return false;
      const res = await cos.request<{ data?: unknown[] }>('POST', '/query', { entity: 'member', filter: { field: 'person', op: 'eq', value: person.id }, limit: 1 });
      return affiliateFromMembers(Array.isArray(res?.data) ? res.data : []);
    })().then((value) => { if (alive) setAnswer({ data, value }); }, () => { if (alive) setAnswer({ data, value: false }); });
    return () => { alive = false; };
  }, [data]);
  return answer && answer.data === data ? answer.value : null;
}
