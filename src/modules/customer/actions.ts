import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActionDef, ActionHandler } from '../../actions/types';
import { demoUsers } from '../../auth/demoUsers';
import { pricingByFamily } from '../../tenant/pricing';
import { tenant } from '../../tenant/tenant';

/**
 * 0025 — what the customer reserve / register flow can be asked to do (WebMCP, and later voice).
 * Declared on the page specs in `./specs.ts` (`CUSTOMER_ACTIONS`), mounted by each page with `useActions()`.
 * `permission` is advisory metadata, as on HUB-01: the route's roles decide whether the page (and so the handler)
 * is mounted at all, and each handler refuses what a person has to do themselves (paying).
 */
const PLAN_IDS = pricingByFamily('membresia').map((p) => p.id);
const SIGN_IN_IDS = demoUsers.filter((u) => u.role !== 'public').map((u) => u.id);

export const appGoHome: ActionDef = { id: 'app.goHome', label: { es: 'Ir al inicio', en: 'Go home' }, intent: { es: 'Llévame al inicio de la app', en: 'Take me to the app home' } };
export const appOpenSchedule: ActionDef = { id: 'app.openSchedule', label: { es: 'Abrir el horario', en: 'Open the schedule' }, intent: { es: 'Muéstrame el horario de clases', en: 'Show me the class schedule' }, permission: 'classes.read' };
/** 0040: C-27 Tu práctica, from anywhere in the app. */
export const appOpenPractice: ActionDef = { id: 'app.openPractice', label: { es: 'Ver mi práctica', en: 'See my practice' }, intent: { es: 'Muéstrame mi práctica', en: 'Show me my practice' } };
/** Shell-level navigation, declared on every page of the reserve / register flow (the registry has no shell scope). */
export const APP_NAV_ACTIONS: ActionDef[] = [appGoHome, appOpenSchedule, appOpenPractice];

/** 0040: the member's weekly practice goal (C-01 inline picker, C-27 GoalSection). 0 = "sin meta": counts stay, the streak hides. */
export const appSetGoal: ActionDef = {
  id: 'app.setGoal', label: { es: 'Cambiar mi meta semanal', en: 'Change my weekly goal' },
  intent: { es: 'Quiero practicar {target} veces por semana', en: 'I want to practise {target} times a week' },
  params: { target: 'number 0–7 (0 = sin meta)' }, permission: 'bookings.write',
};

/** 0047: the WhatsApp number (and wa.me link) for a topic, resolved through M-08a contacts, hours and holidays. Read-only. */
export const contactWhatsapp: ActionDef = {
  id: 'contact.whatsapp', label: { es: 'WhatsApp del estudio por tema', en: 'Studio WhatsApp by topic' },
  intent: { es: 'Dame el WhatsApp para {intent}', en: 'Give me the WhatsApp for {intent}' },
  params: { intent: 'enum:frontDesk,sales,specials,support,finance,payroll,legal,coordinator,owner (default frontDesk)', text: 'string — prefilled message (optional)' },
};

export const appReserve: ActionDef = {
  id: 'app.reserve', label: { es: 'Reservar una clase', en: 'Reserve a class' },
  intent: { es: 'Reserva la clase {session}', en: 'Reserve the class {session}' },
  params: { session: 'string (class_sessions.id)' }, permission: 'bookings.write',
};
export const appPickMat: ActionDef = {
  id: 'app.pickMat', label: { es: 'Elegir tapete', en: 'Pick a mat' },
  intent: { es: 'Quiero el tapete {mat}', en: 'I want mat {mat}' },
  params: { mat: `number 1–${tenant.studio.mats}` }, permission: 'bookings.write',
};
export const appConfirmReservation: ActionDef = {
  id: 'app.confirmReservation', label: { es: 'Confirmar la reserva', en: 'Confirm the reservation' },
  intent: { es: 'Confirma mi reserva', en: 'Confirm my reservation' }, permission: 'bookings.write',
};
export const appChoosePlan: ActionDef = {
  id: 'app.choosePlan', label: { es: 'Elegir un plan', en: 'Choose a plan' },
  intent: { es: 'Quiero el plan {plan}', en: 'I want the {plan} plan' },
  params: { plan: `enum:${PLAN_IDS.join(',')}` }, permission: 'payments.read',
};
export const authSignIn: ActionDef = {
  id: 'auth.signIn', label: { es: 'Entrar', en: 'Sign in' },
  intent: { es: 'Entra como {user}', en: 'Sign in as {user}' },
  params: { user: `enum:${SIGN_IN_IDS.join(',')}` },
};

/** Page code → the actions it declares. Merged into the specs in `./specs.ts`. */
export const CUSTOMER_ACTIONS: Record<string, ActionDef[]> = {
  'C-01': [appSetGoal, ...APP_NAV_ACTIONS],
  'C-27': [appSetGoal, ...APP_NAV_ACTIONS],
  'C-02': [appReserve, ...APP_NAV_ACTIONS],
  'C-04': [appPickMat, appConfirmReservation, ...APP_NAV_ACTIONS],
  'C-06': [appChoosePlan, ...APP_NAV_ACTIONS],
  'C-08': APP_NAV_ACTIONS,
  'C-25': [contactWhatsapp],
  'A-02': [authSignIn],
};

/** Handlers for `APP_NAV_ACTIONS`; spread them into the page's own (memoized) handler object. */
export function useAppNavHandlers(): Record<string, ActionHandler> {
  const nav = useNavigate();
  return useMemo(() => ({
    'app.goHome': () => { nav('/app'); return 'opened /app'; },
    'app.openSchedule': () => { nav('/app/schedule'); return 'opened /app/schedule'; },
    'app.openPractice': () => { nav('/app/practice'); return 'opened /app/practice'; },
  }), [nav]);
}

/** Reads a required string param or throws, so `run()` answers `{ ok: false }` instead of pretending. */
export function need(p: Record<string, string> | undefined, key: string): string {
  const v = p?.[key]?.trim();
  if (!v) throw new Error(`missing param "${key}"`);
  return v;
}
