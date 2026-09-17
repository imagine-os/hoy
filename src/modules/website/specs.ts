import { defineSpec } from '../../specs/define';
import { EVERYONE } from '../../auth/roles';

const pub = { roles: EVERYONE, integrations: [] as string[] };

export const siteSpecs = {
  home: defineSpec({ ...pub, code: 'W-01', name: { es: 'Sitio · Inicio', en: 'Site · Home' },
    purpose: { es: 'La portada pública: promesa de marca, cuatro movimientos, clases de hoy, planes destacados, profesores y CTA a clase de prueba.', en: 'The public front page: brand promise, four movements, today’s classes, featured plans, teachers and trial-class CTA.' },
    layout: ['Hero', 'Movements', 'TodayClasses', 'PlansTeaser', 'TeachersTeaser'],
    data: ['class_sessions', 'modalities', 'teachers', 'plans'],
    logic: ['Sections render in the order stored by the layout editor (useLayout).', 'Today list shows only scheduled sessions for the current date.', 'All prices come from src/tenant/pricing.ts.'],
    integrations: ['Supabase Realtime'], states: ['default', 'no classes today'] }),
  about: defineSpec({ ...pub, code: 'W-02', name: { es: 'Sitio · Filosofía', en: 'Site · Philosophy' },
    purpose: { es: 'Quiénes somos y cómo hablamos: humana, cercana, directa, presente.', en: 'Who we are and how we speak: human, close, direct, present.' },
    layout: ['PageHead', 'Manifesto', 'ValuesRow', 'BrandBoard'], data: [], logic: ['Copy comes from the brand manual (reference/brand).'], states: ['default'] }),
  modalities: defineSpec({ ...pub, code: 'W-03', name: { es: 'Sitio · Modalidades', en: 'Site · Modalities' },
    purpose: { es: 'Las seis prácticas del club agrupadas por movimiento, con intensidad, duración y si es sala caliente.', en: 'The six practices grouped by movement, with intensity, duration and heated room.' },
    layout: ['PageHead', 'ModalityGrid'], data: ['modalities'], logic: ['Groups by movement in the order Enraíza, Fluye, Arde, Libera.'], states: ['default'] }),
  schedule: defineSpec({ ...pub, code: 'W-04', name: { es: 'Sitio · Horario', en: 'Site · Schedule' },
    purpose: { es: 'Horario semanal público con cupos en vivo. Tocar una clase pide iniciar sesión y lleva a la app de clientes.', en: 'Public weekly schedule with live capacity. Tapping a class prompts sign-in and leads to the customer app.' },
    layout: ['PageHead', 'DayTabs', 'ClassList', 'Legend', 'LoginPrompt (Drawer)'],
    data: ['class_sessions', 'modalities', 'teachers', 'rooms'],
    logic: ['Shows 7 days starting today; Sundays show the empty state.', 'Capacity = capacity − booked_count from class_sessions.', 'Deep click → login prompt → /app (demo: switches to the customer demo user).'],
    integrations: ['Supabase Realtime', 'Supabase Auth'], states: ['default', 'day without classes', 'login prompt open'] }),
  teachers: defineSpec({ ...pub, code: 'W-05', name: { es: 'Sitio · Profesores', en: 'Site · Teachers' },
    purpose: { es: 'Galería pública de profesores con bio y especialidades.', en: 'Public teacher gallery with bio and specialties.' },
    layout: ['PageHead', 'TeacherGrid'], data: ['teachers', 'modalities'], logic: ['Only active teachers.'], states: ['default'] }),
  contact: defineSpec({ ...pub, code: 'W-06', name: { es: 'Sitio · Contacto', en: 'Site · Contact' },
    purpose: { es: 'WhatsApp, correo, dirección y horario del estudio desde la configuración del tenant.', en: 'WhatsApp, email, address and hours from the tenant config.' },
    layout: ['PageHead', 'ContactCards', 'MapPlaceholder'], data: ['tenants'], logic: ['No hardcoded contact data: reads src/tenant/tenant.ts.'], integrations: ['WhatsApp'], states: ['default'] }),
};
