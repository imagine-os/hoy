import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NavigationType, Router, parsePath, useLocation, type Location, type Navigator, type To } from 'react-router-dom';
import { cleanPathOf, hrefOf, internalPathOf } from '../modules/website/paths';

/**
 * Lane H-SEO (D11): the router the production build gives the public website, on real paths (`/planes`, `/clases/fuego`).
 * Inside, the routes stay the app's (`/site/plans`), so no page and no link changes: this router only shows a website
 * route at its public path (src/modules/website/paths.ts) and back. A link or navigation to anything else (the app,
 * sign-in, staff, the Hub, `/coming-soon`) leaves for its hash route (`/#/app/…`), where `HashRouter` takes over
 * (`onLeave`, src/app/App.tsx).
 */
export function SiteRouter({ children, onLeave }: { children: ReactNode; onLeave: (href: string, replace: boolean) => void }) {
  const [state, setState] = useState(() => ({ action: NavigationType.Pop, location: fromWindow() }));

  useEffect(() => {
    const pop = () => setState({ action: NavigationType.Pop, location: fromWindow() });
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);

  const navigator = useMemo<Navigator>(() => {
    const go = (to: To, usr: unknown, replace: boolean) => {
      const parts = typeof to === 'string' ? parsePath(to) : to;
      const pathname = parts.pathname ?? '/';
      const search = parts.search ?? '';
      const hash = parts.hash ?? '';
      if (pathname !== '/' && cleanPathOf(pathname) === null) return onLeave(hrefOf({ pathname, search, hash }), replace);
      const key = Math.random().toString(36).slice(2, 10);
      window.history[replace ? 'replaceState' : 'pushState']({ usr: usr ?? null, key }, '', hrefOf({ pathname, search, hash }));
      setState({ action: replace ? NavigationType.Replace : NavigationType.Push, location: { pathname, search, hash, state: usr ?? null, key } });
    };
    return {
      createHref: (to) => hrefOf(typeof to === 'string' ? { pathname: '/', ...parsePath(to) } : { pathname: to.pathname ?? '/', search: to.search, hash: to.hash }),
      go: (delta) => window.history.go(delta),
      push: (to, usr) => go(to, usr, false),
      replace: (to, usr) => go(to, usr, true),
    };
  }, [onLeave]);

  return <Router location={state.location} navigationType={state.action} navigator={navigator}>{children}</Router>;
}

/** The address bar → the route it shows (`/planes` → `/site/plans`; `/` stays the root entry). */
function fromWindow(): Location {
  const { pathname, search, hash } = window.location;
  const st = (window.history.state ?? {}) as { usr?: unknown; key?: string };
  return { pathname: internalPathOf(pathname) ?? pathname, search, hash, state: st.usr ?? null, key: st.key ?? 'default' };
}

/**
 * Inside `HashRouter` (production): a website route (`/#/site/plans`, an old link, or a link from the app) moves to its
 * public path, `replace` so Back doesn't return to the hash address.
 */
export function SiteHandoff({ onPath }: { onPath: (href: string) => void }) {
  const { pathname, search, hash } = useLocation();
  useEffect(() => { onPath(hrefOf({ pathname, search, hash })); }, [pathname, search, hash, onPath]);
  return null;
}
