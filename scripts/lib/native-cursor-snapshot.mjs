/** Self-contained browser function: query and style reads share one JS task, never a stale ElementHandle.
 * Return false only while required DOM is missing/detached/invisible. Wrong cursor values return immediately
 * and must fail the caller's strict assertions; no retry-until-styled behavior. */
export function nativeCursorSnapshot() {
  const visible = el => !!el && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const site = document.querySelector('.site');
  const brand = document.querySelector('.site-brand');
  const coming = document.querySelector('.coming-soon-login');
  if (!document.body?.isConnected || (site ? !visible(brand) : !visible(coming))) return false;
  const controls = [];
  for (const selector of ['.site-brand','.site-nav a','.site-actions button','.coming-soon-login']) {
    const el = [...document.querySelectorAll(selector)].find(visible);
    if (el) controls.push({ selector, cursor: getComputedStyle(el).cursor, connected: el.isConnected });
  }
  return {
    overlays: document.querySelectorAll('.element-cursor,.element-cursor-dot,.element-cursor-ring').length,
    active: document.documentElement.classList.contains('element-cursor-active'),
    body: getComputedStyle(document.body).cursor,
    fits: document.documentElement.scrollWidth <= innerWidth + 1,
    url: location.href,
    controls,
  };
}

/** Like the control snapshot, sample a fresh connected text control in one browser JS task.
 * Only missing/detached/invisible DOM waits. A wrong caret value returns immediately. */
export function nativeTextCaretSnapshot(selector) {
  const el = [...document.querySelectorAll(selector)].find(node => node.isConnected && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
  if (!el) return false;
  return { cursor: getComputedStyle(el).cursor, connected: el.isConnected, selector, url: location.href };
}
