import { customerAuthLink, customerReturn } from '../modules/customer/auth/customerReturn';

/** Reuse the customer navigation allowlist; role/data authorization remains at the destination. */
export function visitorSignIn(destination: string | null | undefined): string {
  const next = customerReturn(destination);
  return `/auth/sign-in${next ? `?${new URLSearchParams({next})}` : ''}`;
}

/**
 * H-2: only a sign-in or sign-up screen (with a validated `next`) may be where Google sends the person back to. The value
 * comes from the URL, so anything else falls back to sign-in (no open redirect).
 */
export function safeAuthBack(value: string | null): string {
  const [path, query = ''] = (value ?? '').split('?');
  if (path !== '/auth/sign-in' && path !== '/auth/sign-up') return '/auth/sign-in';
  return customerAuthLink(path, new URLSearchParams(query));
}
