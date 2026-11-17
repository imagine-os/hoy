export type TestCopy = { subject: string; body: string };
export type TestSource = TestCopy & { id: string; body_html?: unknown };
export type TestHistory = { id: string; at: string; actor: string | null; recipient: string; mode: 'live' | 'draft'; sourceHash: string; status: string; error: string | null };
export type TestConfig = { enabled: boolean; from: string; replyTo: string; history: TestHistory[] };
export const validTestRecipient = (value: string) => value.length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>.]+(?:\.[^\s@,;<>.]+)+$/.test(value);
export const liveSource = (r: { id?: unknown; subject?: unknown; body?: unknown; body_html?: unknown }): TestSource =>
  ({ id: String(r.id ?? ''), subject: String(r.subject ?? ''), body: String(r.body ?? ''), body_html: r.body_html });
export function testPayload(source: TestSource, recipient: string, mode: 'live' | 'draft', draft: TestCopy | null) {
  if (mode === 'draft' && !draft) throw new Error('draft_required');
  return { templateId: source.id, recipient: recipient.trim(), mode,
    source: { subject: source.subject, body: source.body, bodyHtml: String(source.body_html ?? '') },
    ...(mode === 'draft' ? { draft: { subject: draft!.subject, body: draft!.body } } : {}),
  };
}
const REFUSALS: Record<string, string> = { test_rate_limit: 'rateLimit', template_changed: 'changed', test_sample_missing: 'sampleMissing', template_tests_disabled: 'disabled' };
/** Maps a refusal code (from `errorCode(e)`, either error shape) to its copy key. Definitive = the server refused and nothing was queued, so the idempotency key is dropped; network errors, 5xx and unknown codes keep it. */
export function testRefusal(code: string, status?: number) {
  const key = REFUSALS[code] ?? null;
  return { key: key ?? 'failed', definitive: !!key && (status === undefined || status === 0 || (status >= 400 && status < 500)) };
}
