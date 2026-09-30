// Data hooks for the manual as a staff LMS (0031). Everything goes through useData() / useTable(), so the
// MockProvider today and Supabase tomorrow behave the same; every write also appends an audit_log row.
import { useCallback, useMemo } from 'react';
import { useData, useTable } from '../../data/DataContext';
import { useSession } from '../../auth/SessionProvider';
import { TEAM_ROLES, type Role } from '../../auth/roles';
import { demoUserById, demoUsers } from '../../auth/demoUsers';
import type { ManualOverrideRow, ManualProgressRow, ManualRequestRow, ManualTrainingRow, ProfileRow, StudioPolicyRow, TrainingStage } from '../../data/schema';
import type { Lang } from '../../i18n/types';
import { useAudit } from '../staff/audit';
import { SIGNOFF } from './training';
import type { EditLevel } from './sections';

/** Who may edit a policy or section at `level`: owner = admin + super admin; coordinator = coordination too. */
export const canEditLevel = (role: Role, level: EditLevel): boolean => role === 'admin' || role === 'super_admin' || (level === 'coordinator' && role === 'coordinator');
/** Admin and super admin: the owner level, who may rewrite any `##` section in place (0050). */
export const isOwner = (role: Role): boolean => role === 'admin' || role === 'super_admin';
/**
 * Who may rewrite one `##` section in place (0050): admin and super admin every section, marked or not;
 * coordination only the sections marked `{{editable:coordinator}}`; everyone else none (they request or suggest).
 */
export const canEditSection = (role: Role, section: { heading: string; editable?: EditLevel }): boolean =>
  !!section.heading && (isOwner(role) || (!!section.editable && canEditLevel(role, section.editable)));
/** Coordination and up sign training stages, see the team view and answer change requests. */
export const isLead = (role: Role): boolean => role === 'admin' || role === 'super_admin' || role === 'coordinator';
/** People on the team (the LMS applies to them; customers and visitors just read). */
export const isTeam = (role: Role): boolean => TEAM_ROLES.includes(role);

const now = () => new Date().toISOString();

/** user_id → display name, from the demo users and the profiles table. */
export function useNames(): (id: string | null | undefined) => string {
  const { rows } = useTable<ProfileRow>('profiles');
  const map = useMemo(() => new Map(rows.map((p) => [p.user_id, p.full_name])), [rows]);
  return useCallback((id) => (id ? demoUserById(id)?.name ?? map.get(id) ?? id : '—'), [map]);
}

/** The team roster the "Equipo" view and the training sign-off list: one demo user per team role. */
export const TEAM_PEOPLE = demoUsers.filter((u) => TEAM_ROLES.includes(u.role) && u.role !== 'super_admin');

// ---- reading progress ----
export function useProgress(userId?: string) {
  const { rows } = useTable<ManualProgressRow>('manual_progress', userId ? { where: { user_id: userId } } : undefined);
  /** chapter slug → newest read row. */
  const bySlug = useMemo(() => {
    const m = new Map<string, ManualProgressRow>();
    for (const r of rows) { const hit = m.get(`${r.user_id}|${r.chapter_slug}`); if (!hit || hit.read_at < r.read_at) m.set(`${r.user_id}|${r.chapter_slug}`, r); }
    return m;
  }, [rows]);
  const readOf = useCallback((user: string, slug: string) => bySlug.get(`${user}|${slug}`), [bySlug]);
  return { rows, readOf };
}

export function useMarkRead() {
  const data = useData();
  const { user } = useSession();
  const audit = useAudit('admin');
  return useCallback(async (slug: string, version: string) => {
    const row = await data.insert<ManualProgressRow>('manual_progress', { user_id: user.id, chapter_slug: slug, version: version || '—', read_at: now() });
    await audit('manual.read', 'manual_progress', row.id, { chapter: slug, version });
    return row;
  }, [data, user.id, audit]);
}

/** Back to unread (0050): removes the person's read rows for the chapter (the newest wins, so all go); the audit keeps the trail. */
export function useMarkUnread() {
  const data = useData();
  const { user } = useSession();
  const audit = useAudit('admin');
  return useCallback(async (slug: string) => {
    const rows = await data.list<ManualProgressRow>('manual_progress', { where: { user_id: user.id, chapter_slug: slug } });
    for (const r of rows) await data.remove('manual_progress', r.id);
    await audit('manual.unread', 'manual_progress', rows[0]?.id ?? null, { chapter: slug, removed: rows.length });
    return rows.length;
  }, [data, user.id, audit]);
}

// ---- training ----
export function useTraining(userId?: string) {
  const { rows } = useTable<ManualTrainingRow>('manual_training', userId ? { where: { user_id: userId } } : undefined);
  const has = useCallback((user: string, role: string, stage: TrainingStage, key: string) => rows.some((r) => r.user_id === user && r.role === role && r.stage === stage && r.item_key === key), [rows]);
  const signoff = useCallback((user: string, role: string, stage: TrainingStage) => rows.find((r) => r.user_id === user && r.role === role && r.stage === stage && r.item_key === SIGNOFF), [rows]);
  return { rows, has, signoff };
}

export function useTrainingWrites() {
  const data = useData();
  const { user } = useSession();
  const audit = useAudit('admin');
  const toggle = useCallback(async (subject: string, role: string, stage: TrainingStage, key: string, done: boolean) => {
    if (done) {
      const row = await data.insert<ManualTrainingRow>('manual_training', { user_id: subject, role, stage, item_key: key, done_at: now(), signed_by: null });
      await audit('manual.training.check', 'manual_training', row.id, { subject, role, stage, item: key });
    } else {
      const rows = await data.list<ManualTrainingRow>('manual_training', { where: { user_id: subject, role, stage, item_key: key } });
      for (const r of rows) await data.remove('manual_training', r.id);
      await audit('manual.training.uncheck', 'manual_training', null, { subject, role, stage, item: key });
    }
  }, [data, audit]);
  const sign = useCallback(async (subject: string, role: string, stage: TrainingStage) => {
    const row = await data.insert<ManualTrainingRow>('manual_training', { user_id: subject, role, stage, item_key: SIGNOFF, done_at: now(), signed_by: user.id });
    await audit('manual.training.sign', 'manual_training', row.id, { subject, role, stage });
    return row;
  }, [data, audit, user.id]);
  return { toggle, sign };
}

// ---- section overrides (edits beside the markdown) ----
export function useOverrides(slug: string | undefined, lang: Lang) {
  const { rows } = useTable<ManualOverrideRow>('manual_overrides', slug ? { where: { chapter_slug: slug, lang } } : { where: { chapter_slug: '__none__' } });
  const sorted = useMemo(() => [...rows].sort((a, b) => a.version - b.version || a.created_at.localeCompare(b.created_at)), [rows]);
  /** Current live override of a section (highest live version), if any. */
  const liveOf = useCallback((heading: string) => [...sorted].reverse().find((r) => r.section_heading === heading && r.status === 'live'), [sorted]);
  const historyOf = useCallback((heading: string) => sorted.filter((r) => r.section_heading === heading), [sorted]);
  const suggestionsOf = useCallback((heading: string) => sorted.filter((r) => r.section_heading === heading && r.status === 'suggested'), [sorted]);
  return { rows: sorted, liveOf, historyOf, suggestionsOf };
}

export function useOverrideWrites() {
  const data = useData();
  const { user } = useSession();
  const audit = useAudit('admin');
  const nextVersion = useCallback(async (slug: string, lang: Lang, heading: string) => {
    const rows = await data.list<ManualOverrideRow>('manual_overrides', { where: { chapter_slug: slug, lang, section_heading: heading } });
    return rows.reduce((n, r) => Math.max(n, r.version), 0) + 1;
  }, [data]);
  const save = useCallback(async (slug: string, lang: Lang, heading: string, body: string, note: string | null, status: 'live' | 'suggested' = 'live') => {
    const version = await nextVersion(slug, lang, heading);
    const row = await data.insert<ManualOverrideRow>('manual_overrides', { chapter_slug: slug, lang, section_heading: heading, body_md: body, edited_by: user.id, note, version, status });
    await audit(status === 'live' ? 'manual.section.edit' : 'manual.section.suggest', 'manual_overrides', row.id, { chapter: slug, lang, section: heading, version });
    return row;
  }, [data, user.id, audit, nextVersion]);
  const restore = useCallback(async (slug: string, lang: Lang, heading: string) => {
    const rows = await data.list<ManualOverrideRow>('manual_overrides', { where: { chapter_slug: slug, lang, section_heading: heading, status: 'live' } });
    for (const r of rows) await data.update<ManualOverrideRow>('manual_overrides', r.id, { status: 'reverted' });
    await audit('manual.section.restore', 'manual_overrides', null, { chapter: slug, lang, section: heading, reverted: rows.length });
    return rows.length;
  }, [data, audit]);
  const decide = useCallback(async (row: ManualOverrideRow, accept: boolean) => {
    const version = accept ? await nextVersion(row.chapter_slug, row.lang, row.section_heading) : row.version;
    await data.update<ManualOverrideRow>('manual_overrides', row.id, { status: accept ? 'live' : 'dismissed', version });
    await audit(accept ? 'manual.suggestion.accept' : 'manual.suggestion.dismiss', 'manual_overrides', row.id, { chapter: row.chapter_slug, section: row.section_heading });
  }, [data, audit, nextVersion]);
  return { save, restore, decide };
}

// ---- change requests ----
export function useRequests(slug?: string) {
  const { rows } = useTable<ManualRequestRow>('manual_requests', slug ? { where: { chapter_slug: slug } } : undefined);
  return useMemo(() => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)), [rows]);
}

export function useRequestWrites() {
  const data = useData();
  const { user } = useSession();
  const audit = useAudit('admin');
  const add = useCallback(async (slug: string, lang: Lang, request: string, section: string | null) => {
    const row = await data.insert<ManualRequestRow>('manual_requests', { chapter_slug: slug, section_heading: section, lang, request, requested_by: user.id, status: 'open', answer: null });
    await audit('manual.request', 'manual_requests', row.id, { chapter: slug, section });
    return row;
  }, [data, user.id, audit]);
  const answer = useCallback(async (id: string, answerText: string | null, status: 'done' | 'dismissed' | 'open' = 'done') => {
    const row = await data.update<ManualRequestRow>('manual_requests', id, { answer: answerText, status });
    await audit('manual.request.answer', 'manual_requests', id, { status });
    return row;
  }, [data, audit]);
  return { add, answer };
}

// ---- text policies ----
export function useStudioPolicies() {
  const { rows } = useTable<StudioPolicyRow>('studio_policies');
  const byKey = useCallback((key: string) => rows.find((r) => r.key === key), [rows]);
  return { rows, byKey };
}

export function useStudioPolicyWrite() {
  const data = useData();
  const { user } = useSession();
  const audit = useAudit('admin');
  return useCallback(async (row: StudioPolicyRow, value_es: string, value_en: string) => {
    await data.update<StudioPolicyRow>('studio_policies', row.id, { value_es, value_en, updated_by: user.id });
    await audit('manual.policy.edit', 'studio_policies', row.id, { key: row.key, before: row.value_es, after: value_es });
  }, [data, user.id, audit]);
}
