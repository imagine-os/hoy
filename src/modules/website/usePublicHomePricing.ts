import { useEffect, useRef, useState } from 'react';
import { useData } from '../../data/DataContext';
import type { DataProvider } from '../../data/types';
import type { CatalogPlan } from '../../data/productCatalog';
import { localCatalogMode, quotePurchaseDate } from '../../data/operationalQuotes';
import { studioDate, studioParts } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { PUBLIC_HOME_PRICING_CONTRACT } from './publicHomePricing.contract';
import { publicHomeOffer } from './publicHomePricing';

interface PricingRead { provider: DataProvider; rows: CatalogPlan[] | null }

/** Scoped public projection only; a future adapter still needs authorized server reads. */
export function usePublicHomePricing() {
  const data = useData();
  const currentProvider = useRef(data);
  currentProvider.current = data;
  const [snapshot, setSnapshot] = useState<PricingRead | null>(null);
  const [date, setDate] = useState(() => quotePurchaseDate());
  // The configured tenant stays the same when its repository adapter is replaced.
  const publicationObserved = useRef(false);

  useEffect(() => {
    let alive = true, request = 0;
    const refresh = async () => {
      const ticket = ++request;
      setSnapshot({ provider: data, rows: null });
      try {
        const rows = await data.list<CatalogPlan>(PUBLIC_HOME_PRICING_CONTRACT.table, { where: { [PUBLIC_HOME_PRICING_CONTRACT.tenantField]: tenant.id } });
        if (!alive || ticket !== request || currentProvider.current !== data) return;
        const scoped = rows.filter(row => row.tenant_id === tenant.id);
        publicationObserved.current = publicationObserved.current || localCatalogMode(scoped);
        setSnapshot({ provider: data, rows: scoped });
      } catch {
        if (alive && ticket === request && currentProvider.current === data) setSnapshot({ provider: data, rows: null });
      }
    };
    const resume = () => { void refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') resume(); };
    void refresh();
    const off = data.subscribe(PUBLIC_HOME_PRICING_CONTRACT.table, resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', visible);
    return () => {
      alive = false; request++;
      off();
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [data]);

  useEffect(() => {
    let timer = 0;
    const refresh = () => setDate(quotePurchaseDate());
    const tick = () => {
      refresh();
      const now = new Date(), parts = studioParts(now);
      const delay = Math.min(60000, Math.max(1, studioDate(parts.year, parts.month, parts.day + 1).getTime() - now.getTime() + 1));
      timer = window.setTimeout(tick, delay);
    };
    tick();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const rows = snapshot?.provider === data ? snapshot.rows : null;
  // Failed/pending reads suppress amounts. Once publication was seen, missing data never revives launch prices.
  const published = rows === null || publicationObserved.current;
  return {
    trial: publicHomeOffer(rows ?? [], 'trial', date, published),
    pack: publicHomeOffer(rows ?? [], 'pack12', date, published),
    private: publicHomeOffer(rows ?? [], 'private', date, published),
  };
}
