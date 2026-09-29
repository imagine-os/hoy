/**
 * 0039 — copy text to the clipboard: the async Clipboard API when the page has it (secure context), else a
 * hidden textarea + execCommand for older browsers and embedded previews. Never throws; returns whether it copied.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the textarea */ }
  try {
    const el = document.createElement('textarea');
    el.value = text; el.setAttribute('readonly', ''); el.style.position = 'fixed'; el.style.opacity = '0';
    document.body.appendChild(el); el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  } catch { return false; }
}
