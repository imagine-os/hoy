/** Presentation-only E.164 shape check. Does not verify ownership or WhatsApp registration. */
export function whatsappDigits(value: string | null | undefined): string | null {
  const display = value?.trim() ?? '';
  if (!/^\+?[\d\s().-]+$/.test(display)) return null;
  const digits = display.replace(/\D/g, '');
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}
export interface PublicWhatsappTarget { href: string | null; fallback: boolean }
export function publicWhatsappTarget(primary: string, alternatives: readonly string[], text?: string): PublicWhatsappTarget {
  const numbers = [primary, ...alternatives];
  for (let i = 0; i < numbers.length; i++) {
    const digits = whatsappDigits(numbers[i]);
    if (digits) return { href: `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`, fallback: i > 0 };
  }
  return { href: null, fallback: false };
}
