import { defineSpec } from '../../specs/define';

/** H-2 production-only pages. The sign-in and sign-up screens keep their canvas codes (A-02, A-03). */
export const callbackSpec = defineSpec({
  code: 'A-07', name: { es: 'Regreso de Google', en: 'Back from Google' },
  purpose: { es: 'Termina el acceso con Google y vuelve a entrar o a crear cuenta.', en: 'Finishes the Google sign-in and returns to sign-in or sign-up.' },
  layout: ['AuthShell', 'Loading line', 'Clerk redirect callback'], data: [], roles: ['public'],
  logic: ['Clerk completes the OAuth sign-in, or the sign-up of a new Google account (transfer).', 'The return target is only /auth/sign-in or /auth/sign-up with a validated next (no open redirect).'],
  integrations: ['Clerk'], states: ['finishing', 'error → sign-in'], notes: ['Production build only (VITE_HOY_BUILD=production).'],
});

export const accessSpec = defineSpec({
  code: 'C-38', name: { es: 'Acceso y seguridad', en: 'Sign-in and security' },
  purpose: { es: 'Ver el correo de acceso y cerrar sesión (CU-04).', en: 'See the sign-in email and sign out (CU-04).' },
  layout: ['Title', 'Current email + how to change it (the studio)', 'Sign-out card'], data: [], roles: ['customer'],
  logic: ['Email change is not self-serve: the studio changes it in Company OS (login, person and receipts stay on one address; Company OS refuses a member changing it and links logins by verified email).', 'Sign-out revokes the Clerk session, clears this app\'s local keys and remounts with no previous data.'],
  integrations: ['Clerk'], states: ['signed in'],
  notes: ['Production build only. The notice to the previous address belongs to the studio-side change in Company OS (H-2 hand-over).'],
});

export const noAccessSpec = defineSpec({
  code: 'E-06', name: { es: 'Sin acceso', en: 'No access' },
  purpose: { es: 'Una cuenta abrió una zona que su rol no permite.', en: 'An account opened an area its role does not allow.' },
  layout: ['Card: title, role, home link, sign out'], data: [], roles: ['public'],
  logic: ['Production replacement of the hub\'s /no-access: no persona switcher or hub link.'], integrations: [], states: ['signed in with a launch role'],
});
