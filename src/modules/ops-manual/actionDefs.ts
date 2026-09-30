// The manual's action declarations (0031), kept import-light: the specs are loaded eagerly by the route
// registry, so this file must not pull the docs index in. Handlers live in ./manualActions.ts.
import type { ActionDef } from '../../actions';
import { TEAM_ROLES as LENS_ROLES } from '../../auth/roles';
import index from '../../../docs/source/index.json';

const SOURCES = index as { id: string }[];
const P = (d: string) => d;
const chapterParam = P('string — chapter slug (04-recepcion-y-check-in) or number (04)');

/** K-03 — the manual (home and chapters). */
export const MANUAL_ACTIONS: ActionDef[] = [
  { id: 'manual.setLens', label: { es: 'Ver el manual como', en: 'View the manual as' }, intent: { es: 'Muéstrame el manual de {role}', en: 'Show me the {role} manual' }, params: { role: `enum:all,${LENS_ROLES.join(',')}` }, permission: 'docs.read' },
  { id: 'manual.markRead', label: { es: 'Marcar como leído', en: 'Mark as read' }, intent: { es: 'Marca el capítulo {chapter} como leído', en: 'Mark chapter {chapter} as read' }, params: { chapter: `${chapterParam}; default the open chapter` }, permission: 'docs.read' },
  { id: 'manual.markUnread', label: { es: 'Marcar como no leído', en: 'Mark as unread' }, intent: { es: 'Marca el capítulo {chapter} como no leído', en: 'Mark chapter {chapter} as unread' }, params: { chapter: `${chapterParam}; default the open chapter` }, permission: 'docs.read' },
  { id: 'manual.signTraining', label: { es: 'Firmar etapa de formación', en: 'Sign off a training stage' }, intent: { es: 'Firma {stage} de {user}', en: 'Sign off {stage} for {user}' }, params: { user: 'string — users.id (usr_desk)', stage: 'enum:day1,week1,month1', role: 'string — the checklist; default the person’s role' }, permission: 'manual.train' },
  { id: 'manual.editSection', label: { es: 'Editar una sección', en: 'Edit a section' }, intent: { es: 'Reescribe la sección {section} del capítulo {chapter}', en: 'Rewrite section {section} of chapter {chapter}' }, params: { chapter: chapterParam, section: 'string — the ## heading text', body: 'markdown — the section body, without the heading', note: 'string — why (optional)', lang: 'enum:es,en — default the interface language' }, permission: 'manual.edit' }, // admin / super_admin: any section; coordinator: {{editable:coordinator}} only
  { id: 'manual.restoreSection', label: { es: 'Restaurar el original', en: 'Restore the original' }, intent: { es: 'Vuelve al texto original de {section}', en: 'Go back to the original text of {section}' }, params: { chapter: chapterParam, section: 'string — the ## heading text', lang: 'enum:es,en' }, permission: 'manual.edit' },
  { id: 'manual.requestChange', label: { es: 'Pedir un cambio', en: 'Request a change' }, intent: { es: 'Pide que el capítulo {chapter} diga {request}', en: 'Ask for chapter {chapter} to say {request}' }, params: { chapter: chapterParam, request: 'string', section: 'string — ## heading (optional)' }, permission: 'docs.read' },
  { id: 'manual.suggestEdit', label: { es: 'Sugerir una edición', en: 'Suggest an edit' }, intent: { es: 'Sugiere este texto para {section}', en: 'Suggest this text for {section}' }, params: { chapter: chapterParam, section: 'string — the ## heading text', body: 'markdown — proposed section body', note: 'string (optional)', lang: 'enum:es,en' }, permission: 'docs.read' },
  { id: 'manual.openSource', label: { es: 'Abrir un documento fuente', en: 'Open a source document' }, intent: { es: 'Abre el documento {id}', en: 'Open the {id} document' }, params: { id: `enum:${SOURCES.map((s) => s.id).join(',')}` }, permission: 'docs.read' },
];

/** K-04 — decisions and requests. */
export const REQUEST_ACTIONS: ActionDef[] = [
  { id: 'manual.listRequests', label: { es: 'Ver solicitudes', en: 'List requests' }, intent: { es: '¿Qué cambios pidió el equipo al manual?', en: 'What changes did the team ask for in the manual?' }, params: { status: 'enum:open,done,dismissed,all — default open' }, permission: 'manual.edit' },
  { id: 'manual.answerRequest', label: { es: 'Responder una solicitud', en: 'Answer a request' }, intent: { es: 'Responde la solicitud {id}: {answer}', en: 'Answer request {id}: {answer}' }, params: { id: 'string — manual_requests.id', answer: 'string', status: 'enum:done,dismissed,open — default done' }, permission: 'manual.edit' },
];

