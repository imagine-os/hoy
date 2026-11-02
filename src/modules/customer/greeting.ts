/**
 * RES-02 (Jas 1 Nov): the home greets the person by the first name on their own person row (the profile), falling back to
 * the login's name, and never with the email: a nameless email-code login (ProductionSession falls back to the email) is
 * greeted without a name. Returned as text; React shows it as text.
 */
export function greetingName({ person, login, email }: { person?: string | null; login?: string | null; email?: string | null }): string {
  const mail = (email ?? '').trim();
  for (const candidate of [person, login]) {
    const name = (candidate ?? '').trim();
    if (name && !name.includes('@') && name !== mail) return name.split(/\s+/)[0];
  }
  return '';
}
