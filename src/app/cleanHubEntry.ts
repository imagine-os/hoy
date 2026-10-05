/** A same-deployment clean entry; never changes origin or custom-domain settings. */
export function cleanHubTarget(href: string): string | null {
  const target = new URL(href);
  if (!/\/hub(?:\/index\.html|\/)?$/.test(target.pathname)) return null;
  target.pathname = target.pathname.replace(/hub(?:\/index\.html|\/)?$/, '');
  if (!target.hash || target.hash === '#') target.hash = '/hub';
  return target.href;
}
export function enterCleanHub(): boolean {
  const target = cleanHubTarget(window.location.href);
  if (!target) return false;
  window.location.replace(target);
  return true;
}
