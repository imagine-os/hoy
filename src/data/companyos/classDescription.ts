/** One shared, optional plain-text description. Empty/invalid reads inherit the existing class-type copy. */
export const CLASS_DESCRIPTION_LIMIT = 4000;
export function classDescriptionText(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > CLASS_DESCRIPTION_LIMIT) return null;
  return value.trim() || null;
}
/** The existing renderer is bilingual; one entered text is intentionally shown unchanged in either language. */
export function classDescriptionEditorial(value: unknown): { es: string; en: string } | null {
  const text = classDescriptionText(value);
  return text ? { es: text, en: text } : null;
}
