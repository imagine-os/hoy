import { forwardRef } from 'react';
import { Link as RouterLink, NavLink as RouterNavLink, useLocation, type LinkProps, type NavLinkProps, type To } from 'react-router-dom';
import { archiveSupports } from './edition';
export { useParams, useNavigate } from 'react-router-dom';

/** Keep shareable edition state through browsing; operational/safety pages always use Latest. */
export function editionLink(to: To, search: string): To {
  const target = typeof to === 'string' ? { pathname: to.split('?')[0], search: to.includes('?') ? to.slice(to.indexOf('?') + 1) : '' } : to;
  if (!target.pathname?.startsWith('/site')) return to;
  const query = new URLSearchParams(target.search);
  const current = new URLSearchParams(search);
  for (const key of ['version', 'video', 'motion']) if (!query.has(key) && current.has(key)) query.set(key, current.get(key)!);
  if (query.get('version') === 'archive' && !archiveSupports(target.pathname)) query.set('version', 'latest');
  return { ...target, search: query.toString() };
}
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function SiteLink({ to, ...props }, ref) {
  const { search } = useLocation();
  return <RouterLink {...props} ref={ref} to={editionLink(to, search)} />;
});
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function SiteNavLink({ to, ...props }, ref) {
  const { search } = useLocation();
  return <RouterNavLink {...props} ref={ref} to={editionLink(to, search)} />;
});

/** String form for shared components whose target prop is a string. */
export function useSiteHref() {
  const { search } = useLocation();
  return (to: string): string => {
    const target = editionLink(to, search);
    return typeof target === 'string' ? target : `${target.pathname}${target.search ? `?${target.search}` : ''}${target.hash ?? ''}`;
  };
}
