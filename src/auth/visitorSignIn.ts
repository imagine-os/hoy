import { customerReturn } from '../modules/customer/auth/customerReturn';

/** Reuse the customer navigation allowlist; role/data authorization remains at the destination. */
export function visitorSignIn(destination: string | null | undefined): string {
  const next = customerReturn(destination);
  return `/auth/sign-in${next ? `?${new URLSearchParams({next})}` : ''}`;
}
