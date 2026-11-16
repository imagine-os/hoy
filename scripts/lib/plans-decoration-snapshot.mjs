/** Fresh-document query and pseudo-element style reads share one JS task.
 * Missing/detached/invisible required DOM returns false for bounded readiness waiting.
 * Incorrect styles and overflow return evidence immediately for strict assertions, never retry-until-correct. */
export function plansDecorationSnapshot() {
  const el = document.querySelector('.site-pagehead');
  if (!el || !el.isConnected || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') return false;
  const decoration = getComputedStyle(el, '::after');
  return {
    connected: el.isConnected,
    mask: decoration.maskImage,
    pointer: decoration.pointerEvents,
    fits: document.documentElement.scrollWidth <= innerWidth + 1,
    width: innerWidth,
    path: location.pathname,
    edition: el.closest('.site')?.dataset.siteVersion ?? null,
  };
}
