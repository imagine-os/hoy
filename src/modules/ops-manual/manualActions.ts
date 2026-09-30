// The manual's actions (0031): what K-03 / K-04 / K-05 can be asked to do by a click, by an agent over
// WebMCP (window.__hoyos.run) and later by voice. Declared on the specs (specs.ts), implemented here.
// `permission` on a declaration is advisory; each handler below checks the role itself and throws, so
// run() answers { ok: false } with the reason.
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLES, type Role } from '../../auth/roles';
import { useData } from '../../data/DataContext';
import type { ManualRequestRow, TrainingStage, UserRow } from '../../data/schema';
import type { Lang } from '../../i18n/types';
import type { ActionHandler } from '../../actions';
import { loadDoc } from '../docs/docsIndex';
import { LENS_ROLES, chapterNumber } from './audience';
import { chapterFor, chapters, type Chapter } from './manualIndex';
import { canEditSection, isLead, isOwner, isTeam, useMarkRead, useMarkUnread, useOverrideWrites, useRequestWrites, useTrainingWrites } from './manualData';
import { splitSections } from './sections';
import { useLens, type Lens } from './lens';
import { SOURCES, sourceById } from './sources';
import { STAGES } from './training';

export { MANUAL_ACTIONS, REQUEST_ACTIONS } from './actionDefs';

const isRole = (s: string): s is Role => (ROLES as readonly string[]).includes(s);

/** A chapter by slug or number, in `lang` (falls back to Spanish). */
export function findChapter(lang: Lang, ref: string | undefined): Chapter | undefined {
  if (!ref) return undefined;
  const hit = chapterFor(lang, ref);
  if (hit) return hit.chapter;
  const n = chapterNumber(ref);
  const byNum = chapters.find((c) => c.lang === lang && c.number === n) ?? chapters.find((c) => c.lang === 'es' && c.number === n);
  return byNum;
}

/** Handlers for the K-03 actions (mounted by the home and every chapter). */
export function useManualHandlers(): Record<string, ActionHandler> {
  const { lang } = useI18n();
  const { user, role } = useSession();
  const data = useData();
  const navigate = useNavigate();
  const { chapter: openSlug } = useParams();
  const { setLens } = useLens();
  const markRead = useMarkRead();
  const markUnread = useMarkUnread();
  const { sign } = useTrainingWrites();
  const { save, restore } = useOverrideWrites();
  const { add } = useRequestWrites();

  return useMemo(() => {
    const need = (ref: string | undefined, fallback?: string) => {
      const c = findChapter(lang, ref ?? fallback);
      if (!c) throw new Error(`unknown chapter "${ref ?? ''}" — a slug like 04-recepcion-y-check-in or a number like 04`);
      return c;
    };
    const langOf = (p?: Record<string, string>): Lang => (p?.lang === 'en' || p?.lang === 'es' ? p.lang : lang);
    const sectionOf = async (c: Chapter, heading: string | undefined, l: Lang) => {
      if (!heading) throw new Error('section is required — the ## heading text');
      const target = findChapter(l, c.slug) ?? c;
      const body = (await loadDoc(target.path)).replace(/^---\n[\s\S]*?\n---\n?/, '');
      const s = splitSections(body).find((x) => x.heading === heading || x.heading.replace(/^\d+[.)]\s*/, '') === heading.replace(/^\d+[.)]\s*/, ''));
      if (!s || !s.heading) throw new Error(`no section "${heading}" in ${target.slug} — one of: ${splitSections(body).filter((x) => x.heading).map((x) => x.heading).join(' | ')}`);
      return { target, section: s };
    };
    return {
      'manual.setLens': (p) => {
        const r = p?.role ?? '';
        if (r !== 'all' && !LENS_ROLES.includes(r as Role)) throw new Error(`role must be all or one of ${LENS_ROLES.join(', ')}`);
        setLens(r as Lens);
        return `lens ${r}`;
      },
      'manual.markRead': async (p) => {
        if (!isTeam(role)) throw new Error('reading progress is for team roles');
        const c = need(p?.chapter, openSlug);
        await markRead(c.slug, c.version);
        return `read ${c.slug} v${c.version}`;
      },
      'manual.markUnread': async (p) => {
        if (!isTeam(role)) throw new Error('reading progress is for team roles');
        const c = need(p?.chapter, openSlug);
        const n = await markUnread(c.slug);
        return n ? `unread ${c.slug}` : `${c.slug} was not marked read`;
      },
      'manual.signTraining': async (p) => {
        if (!isLead(role)) throw new Error('requires coordinator, admin or super_admin');
        const stage = p?.stage as TrainingStage;
        if (!STAGES.includes(stage)) throw new Error('stage must be day1, week1 or month1');
        const target = p?.user;
        if (!target) throw new Error('user is required (users.id)');
        const u = await data.get<UserRow>('users', target);
        if (!u) throw new Error(`no user ${target}`);
        const roles = await data.list<{ role: string } & UserRow>('user_roles', { where: { user_id: target } });
        const planRole = p?.role && isRole(p.role) ? p.role : (roles[0]?.role as Role | undefined);
        if (!planRole) throw new Error(`user ${target} has no role; pass role`);
        await sign(target, planRole === 'super_admin' ? 'admin' : planRole, stage);
        return `signed ${stage} for ${target} (${planRole})`;
      },
      'manual.editSection': async (p) => {
        const l = langOf(p);
        const { target, section } = await sectionOf(need(p?.chapter, openSlug), p?.section, l);
        // 0050: admin and super admin edit any section; coordination only {{editable:coordinator}}; others suggest.
        if (!isOwner(role) && !section.editable) throw new Error(`section "${section.heading}" is not marked {{editable:…}} — only admin or super_admin edit it; use manual.suggestEdit`);
        if (!canEditSection(role, section)) throw new Error(`requires ${section.editable === 'coordinator' ? 'coordinator, admin or super_admin' : 'admin or super_admin'}`);
        if (!p?.body?.trim()) throw new Error('body is required (markdown)');
        const row = await save(target.slug, l, section.heading, p.body, p.note ?? null, 'live');
        return `edited ${target.slug} · ${section.heading} v${row.version}`;
      },
      'manual.restoreSection': async (p) => {
        const l = langOf(p);
        const { target, section } = await sectionOf(need(p?.chapter, openSlug), p?.section, l);
        if (!canEditSection(role, section)) throw new Error('not allowed to restore this section');
        const n = await restore(target.slug, l, section.heading);
        return n ? `restored ${target.slug} · ${section.heading}` : 'nothing to restore: the section shows the original';
      },
      'manual.requestChange': async (p) => {
        if (!isTeam(role)) throw new Error('requests are for team roles');
        const c = need(p?.chapter, openSlug);
        if (!p?.request?.trim()) throw new Error('request is required');
        const row = await add(c.slug, lang, p.request.trim(), p.section ?? null);
        return `request ${row.id} on ${c.slug}`;
      },
      'manual.suggestEdit': async (p) => {
        if (!isTeam(role)) throw new Error('suggestions are for team roles');
        const l = langOf(p);
        const { target, section } = await sectionOf(need(p?.chapter, openSlug), p?.section, l);
        if (!p?.body?.trim()) throw new Error('body is required (markdown)');
        const row = await save(target.slug, l, section.heading, p.body, p.note ?? `suggested by ${user.id}`, 'suggested');
        return `suggestion ${row.id} on ${target.slug} · ${section.heading} — an owner approves it from the section’s Suggestions chip`;
      },
      'manual.openSource': (p) => {
        const s = sourceById(p?.id ?? '');
        if (!s) throw new Error(`unknown source "${p?.id ?? ''}" — one of ${SOURCES.map((x) => x.id).join(', ')}`);
        navigate(`/docs/source?doc=${s.id}`);
        return `opened ${s.id}`;
      },
    };
  }, [lang, role, user.id, data, navigate, openSlug, setLens, markRead, markUnread, sign, save, restore, add]);
}

/** Handlers for the K-04 actions. */
export function useRequestHandlers(): Record<string, ActionHandler> {
  const { role } = useSession();
  const data = useData();
  const { answer } = useRequestWrites();
  return useMemo(() => ({
    'manual.listRequests': async (p) => {
      if (!isLead(role)) throw new Error('requires coordinator, admin or super_admin');
      const status = p?.status ?? 'open';
      const rows = await data.list<ManualRequestRow>('manual_requests', status === 'all' ? undefined : { where: { status } });
      return JSON.stringify(rows.map((r) => ({ id: r.id, chapter: r.chapter_slug, section: r.section_heading, lang: r.lang, request: r.request, by: r.requested_by, status: r.status, answer: r.answer, at: r.created_at })));
    },
    'manual.answerRequest': async (p) => {
      if (!isLead(role)) throw new Error('requires coordinator, admin or super_admin');
      if (!p?.id) throw new Error('id is required');
      const st = (p.status ?? 'done') as 'done' | 'dismissed' | 'open';
      if (!['done', 'dismissed', 'open'].includes(st)) throw new Error('status must be done, dismissed or open');
      const hit = await data.get<ManualRequestRow>('manual_requests', p.id);
      if (!hit) throw new Error(`no request ${p.id}`);
      await answer(p.id, p.answer ?? null, st);
      return `request ${p.id} ${st}`;
    },
  }), [role, data, answer]);
}

/** Only the K-05 action: open a source document. */
export function useSourceHandlers(): Record<string, ActionHandler> {
  const navigate = useNavigate();
  return useMemo(() => ({
    'manual.openSource': (p) => {
      const s = sourceById(p?.id ?? '');
      if (!s) throw new Error(`unknown source "${p?.id ?? ''}" — one of ${SOURCES.map((x) => x.id).join(', ')}`);
      navigate(`/docs/source?doc=${s.id}`);
      return `opened ${s.id}`;
    },
  }), [navigate]);
}
