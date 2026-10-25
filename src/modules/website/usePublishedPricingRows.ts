import { useEffect, useRef, useState } from 'react';
import { useData } from '../../data/DataContext';
import type { DataProvider } from '../../data/types';
import type { CatalogPlan } from '../../data/productCatalog';
import { localCatalogMode, quotePurchaseDate } from '../../data/operationalQuotes';
import { studioDate, studioParts } from '../../i18n/format';
import { tenant } from '../../tenant/tenant';
import { PUBLISHED_PRICING_CONTRACT } from './publishedPricing.contract';

interface PricingRead { provider: DataProvider; rows: CatalogPlan[] | null; status: 'loading' | 'ready' | 'error' }

/** Scoped public projection only; a future adapter still needs authorized server reads. */
export function usePublishedPricingRows() {
  const data = useData();
  const currentProvider = useRef(data);
  currentProvider.current = data;
  const [snapshot, setSnapshot] = useState<PricingRead | null>(null);
  const [revision, setRevision] = useState(0);
  const [date, setDate] = useState(() => quotePurchaseDate());
  // The configured tenant stays the same when its repository adapter is replaced.
  const publicationObserved = useRef(false);

  useEffect(() => {
    let alive = true, request = 0;
    const refresh = async () => {
      const ticket = ++request;
      setSnapshot({ provider: data, rows: null, status: 'loading' });
      try {
        const rows = await data.list<CatalogPlan>(PUBLISHED_PRICING_CONTRACT.table, { where: { [PUBLISHED_PRICING_CONTRACT.tenantField]: tenant.id } });
        if (!alive || ticket !== request || currentProvider.current !== data) return;
        const scoped = rows.filter(row => row.tenant_id === tenant.id);
        publicationObserved.current = publicationObserved.current || localCatalogMode(scoped);
        setSnapshot({ provider: data, rows: scoped, status: 'ready' });
      } catch {
        if (alive && ticket === request && currentProvider.current === data) setSnapshot({ provider: data, rows: null, status: 'error' });
      }
    };
    const resume = () => { void refresh(); };
    const visible = () => { if (document.visibilityState === 'visible') resume(); };
    void refresh();
    const off = data.subscribe(PUBLISHED_PRICING_CONTRACT.table, resume);
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', visible);
    return () => {
      alive = false; request++;
      off();
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [data, revision]);

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

  const current = snapshot?.provider === data ? snapshot : null;
  return {
    rows: current?.rows ?? [],
    status: current?.status ?? 'loading' as const,
    publicationObserved: publicationObserved.current,
    date,
    retry: () => setRevision(value => value + 1),
  };
}
