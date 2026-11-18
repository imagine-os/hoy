import type { InviteOutcome } from './teamApi';

export type TeamHelpLink = { kind: 'invitation' | 'sign_in'; email: string; url: string };

/** Existing accounts need the ordinary sign-in route, never an invented invitation token or an automatic resend. */
export function accountHelp(outcome: InviteOutcome, signInUrl: string, email: string): TeamHelpLink | null {
  return outcome.kind === 'invited' ? null : { kind: 'sign_in', email, url: signInUrl };
}
