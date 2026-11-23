/** Writes the link to the clipboard (call it from the click handler); any refusal, throw or missing clipboard is `failed`. */
export async function copyLink(url: string, clipboard: Pick<Clipboard, 'writeText'> | undefined = globalThis.navigator?.clipboard): Promise<'copied' | 'failed'> {
  try {
    if (!clipboard) return 'failed';
    await clipboard.writeText(url);
    return 'copied';
  } catch { return 'failed'; }
}
