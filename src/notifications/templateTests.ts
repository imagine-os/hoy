export type TestCopy = { subject: string; body: string };
export type TestSource = TestCopy & { id: string; body_html?: unknown };
export type TestHistory = { id: string; at: string; actor: string | null; recipient: string; mode: 'live' | 'draft'; sourceHash: string; status: string; error: string | null };
export type TestConfig = { enabled: boolean; from: string; replyTo: string; history: TestHistory[] };
export const validTestRecipient = (value: string) => value.length <= 254 && /^[^\s@,;<>]+@[^\s@,;<>.]+(?:\.[^\s@,;<>.]+)+$/.test(value);
export function testPayload(source: TestSource, recipient: string, mode: 'live' | 'draft', draft: TestCopy | null) {
  if (mode === 'draft' && !draft) throw new Error('draft_required');
  return { templateId: source.id, recipient: recipient.trim(), mode,
    source: { subject: source.subject, body: source.body, bodyHtml: String(source.body_html ?? '') },
    ...(mode === 'draft' ? { draft: { subject: draft!.subject, body: draft!.body } } : {}),
  };
}
