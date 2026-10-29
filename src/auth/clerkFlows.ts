/**
 * The Clerk calls behind Hoy's own sign-in screens (CU-03, CU-04), on the classic clerk-js resources
 * (`clerk.client.signIn`, `clerk.client.signUp`, `clerk.user`). Hoy draws the screens itself so they speak Spanish
 * and English and work under the HashRouter; Clerk keeps the security: the code is sent, expires and is checked by
 * Clerk, and the instance's attack protection locks an account after repeated failures (`user_locked`).
 *
 * `ClerkLike` names only what these flows use, so the tests run them against a fake.
 */
interface Factor { strategy: string; emailAddressId?: string }
interface SignInLike {
  status: string | null;
  createdSessionId: string | null;
  supportedFirstFactors?: Factor[] | null;
  prepareFirstFactor(p: { strategy: 'email_code'; emailAddressId: string }): Promise<SignInLike>;
  attemptFirstFactor(p: { strategy: 'email_code'; code: string }): Promise<SignInLike>;
  authenticateWithRedirect(p: { strategy: 'oauth_google'; redirectUrl: string; redirectUrlComplete: string }): Promise<void>;
}
interface SignUpLike {
  status: string | null;
  createdSessionId: string | null;
  missingFields?: string[];
  prepareEmailAddressVerification(p: { strategy: 'email_code' }): Promise<SignUpLike>;
  attemptEmailAddressVerification(p: { code: string }): Promise<SignUpLike>;
}
export interface ClerkLike {
  client?: { signIn: SignInLike & { create(p: { identifier: string }): Promise<SignInLike> }; signUp: SignUpLike & { create(p: { emailAddress: string }): Promise<SignUpLike> } } | null;
  setActive(p: { session: string | null }): Promise<void>;
  signOut(): Promise<void>;
}

export type CodeMode = 'sign-in' | 'sign-up';

const codeOf = (err: unknown) => {
  const e = err as { errors?: { code?: string }[] } | null;
  return e?.errors?.[0]?.code ?? '';
};

/** Sends a one-time code to the email. An unknown email starts a Clerk sign-up instead (the same screen for both). */
export async function sendEmailCode(clerk: ClerkLike, email: string): Promise<CodeMode> {
  const client = clerk.client;
  if (!client) throw Object.assign(new Error('clerk_not_ready'), { code: 'network_error' });
  try {
    const attempt = await client.signIn.create({ identifier: email.trim() });
    const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === 'email_code' && f.emailAddressId);
    if (!factor?.emailAddressId) throw Object.assign(new Error('email_code_unavailable'), { errors: [{ code: 'email_code_unavailable' }] });
    await attempt.prepareFirstFactor({ strategy: 'email_code', emailAddressId: factor.emailAddressId });
    return 'sign-in';
  } catch (err) {
    if (codeOf(err) !== 'form_identifier_not_found') throw err;
  }
  const signUp = await client.signUp.create({ emailAddress: email.trim() });
  await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
  return 'sign-up';
}

/** Checks the code and starts the Clerk session. Throws Clerk's error (wrong, expired, locked…) for the screen to word. */
export async function verifyEmailCode(clerk: ClerkLike, mode: CodeMode, code: string): Promise<void> {
  const client = clerk.client;
  if (!client) throw Object.assign(new Error('clerk_not_ready'), { code: 'network_error' });
  const clean = code.replace(/\s/g, '');
  const result = mode === 'sign-in'
    ? await client.signIn.attemptFirstFactor({ strategy: 'email_code', code: clean })
    : await client.signUp.attemptEmailAddressVerification({ code: clean });
  if (result.status !== 'complete' || !result.createdSessionId) {
    // e.g. the instance asks for a second factor or extra sign-up fields: not part of Hoy's configuration.
    throw Object.assign(new Error(`clerk_${result.status ?? 'incomplete'}`), { errors: [{ code: `clerk_${result.status ?? 'incomplete'}` }] });
  }
  await clerk.setActive({ session: result.createdSessionId });
}

/**
 * Google: leaves for Google and comes back to `#/auth/callback`, which finishes the sign-in (or the sign-up, for a
 * new Google account) and returns to `back`. Both URLs are built on this page's origin, never from input.
 */
export async function signInWithGoogle(clerk: ClerkLike, back: string, location: Pick<Location, 'origin' | 'pathname'> = window.location): Promise<void> {
  const client = clerk.client;
  if (!client) throw Object.assign(new Error('clerk_not_ready'), { code: 'network_error' });
  const base = `${location.origin}${location.pathname}`;
  await client.signIn.authenticateWithRedirect({
    strategy: 'oauth_google',
    redirectUrl: `${base}#/auth/callback?${new URLSearchParams({ back })}`,
    redirectUrlComplete: `${base}#${back}`,
  });
}

/*
 * CU-04 email change is deliberately NOT self-serve at launch (review round 1, B1). Company OS keeps the email on the
 * login and the person, refuses a member changing it (`email_change_not_allowed`), and links a new Clerk account to an
 * existing login by verified email. A change made only in Clerk would free the old address for someone else to claim
 * that login. The studio changes the email in Company OS (which also owns the notice to the previous address).
 */
