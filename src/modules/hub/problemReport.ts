/**
 * Report a problem (Hoy test-fixes, lane Y3): a `form_submission` of the forms module's `problem_report` form (Company
 * OS recipe, lane Y1: every staff role may create it, only Administration and the super admin read it; the reporter
 * never reads it back). Created through the runtime like any staff write (`POST /t/:t/api/form_submission`, with an
 * Idempotency-Key per submit): `{ form_key, email, placement, answers }`, never `person` or the stamps. Answer keys
 * `summary` (required by the Hub: forms 1.0.0 has no required answers), `details`, `route` (the screen), `viewing_as`
 * (the role being viewed, when any); empty values are not stored; control characters other than tab and line breaks
 * are refused by the module, so they are dropped here.
 */
export const PROBLEM_REPORT_FORM = 'problem_report';
export const PROBLEM_REPORT_PATH = '/api/form_submission';
export const SUMMARY_MIN = 3;
export const SUMMARY_MAX = 120;
export const DETAILS_MAX = 2000;

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (s: string) => s.replace(CONTROL, '').trim();

export function problemReportErrors(summary: string, details: string): { summary: boolean; details: boolean } {
  const s = clean(summary);
  return { summary: s.length < SUMMARY_MIN || s.length > SUMMARY_MAX || /[\r\n]/.test(s), details: clean(details).length > DETAILS_MAX };
}

export interface ProblemReportInput { email: string; summary: string; details: string; route: string; viewingAs: string | null }

export function problemReportBody(input: ProblemReportInput): { form_key: string; email: string; placement: string; answers: Record<string, string> } {
  const answers: Record<string, string> = {};
  const put = (key: string, value: string | null | undefined) => { const v = clean(value ?? ''); if (v) answers[key] = v; };
  put('summary', input.summary);
  put('details', input.details);
  put('route', input.route);
  put('viewing_as', input.viewingAs);
  return { form_key: PROBLEM_REPORT_FORM, email: input.email.trim(), placement: 'hub', answers };
}
