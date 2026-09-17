/**
 * Editable content as data: club rules (C-13), the "about HOY" text, the FAQ (C-14/C-15) and the
 * events calendar (C-23). This used to live in src/modules/customer/content.ts as static objects;
 * the pages now read it through useTable() so M-02 can edit it without a deploy.
 * Every string is ES + EN. Figures come from src/tenant/pricing.ts — nothing invents a price here.
 */
import type { ContentArticleRow, EventRow, FaqEntryRow } from '../schema';
import { priceItem } from '../../tenant/pricing';
import { base, iso, NOW } from './catalog';
import { MS } from '../../i18n/format';

const price = (id: string) => priceItem(id)?.price ?? 0;

export const contentArticles: ContentArticleRow[] = [
  { ...base('art_hot_room', 120), slug: 'hot-room', section: 'rules', icon: '♨', required: false, sort: 1, published: true, publish_at: null,
    title: { es: 'Seguridad en sala caliente', en: 'Hot room safety' },
    summary: { es: 'Hidratación, señales del cuerpo y cuándo parar.', en: 'Hydration, body signals and when to stop.' },
    body_md: { es: 'La sala se calienta a 36–38 °C. Es normal sudar mucho; no es normal sentir mareo, náusea o frío repentino. Si pasa, siéntate o acuéstate y avisa al profesor.\n\nToma agua antes, durante y después. Evita comer pesado en las dos horas previas.', en: 'The room is heated to 36–38 °C. Sweating a lot is normal; dizziness, nausea or sudden chills are not. If it happens, sit or lie down and tell the teacher.\n\nDrink water before, during and after. Avoid a heavy meal in the two hours before.' },
    checklist: [{ es: 'Toalla grande para el mat', en: 'Large towel for the mat' }, { es: 'Botella de agua (mínimo 500 ml)', en: 'Water bottle (at least 500 ml)' }, { es: 'Ropa ligera y transpirable', en: 'Light, breathable clothing' }], video_label: null },
  { ...base('art_preparation', 120), slug: 'preparation', section: 'rules', icon: '◔', required: false, sort: 2, published: true, publish_at: null,
    title: { es: 'Preparación para la clase', en: 'Class preparation' },
    summary: { es: 'Qué traer y cuándo llegar.', en: 'What to bring and when to arrive.' },
    body_md: { es: 'Llega 10 minutos antes. La puerta de la sala se cierra al empezar para cuidar la energía del grupo.\n\nHay mats y bloques en el estudio; si prefieres el tuyo, tráelo.', en: 'Arrive 10 minutes early. The room door closes at start time to protect the group’s focus.\n\nMats and blocks are available; bring your own if you prefer.' },
    checklist: [{ es: 'Reserva confirmada en la app', en: 'Booking confirmed in the app' }, { es: 'Llegar 10 min antes', en: 'Arrive 10 min early' }, { es: 'Teléfono en silencio en el casillero', en: 'Phone silenced, in the locker' }], video_label: null },
  { ...base('art_etiquette', 120), slug: 'etiquette', section: 'rules', icon: '☼', required: false, sort: 3, published: true, publish_at: null,
    title: { es: 'Etiqueta del estudio', en: 'Studio etiquette' },
    summary: { es: 'Silencio, espacio y respeto.', en: 'Silence, space and respect.' },
    body_md: { es: 'Hablamos bajo en la sala y dejamos los zapatos en la entrada. Cada mat es un espacio propio: pide permiso antes de acercarte.\n\nCancela con tiempo si no vas a venir: alguien en lista de espera quiere tu cupo.', en: 'We speak softly in the room and leave shoes at the entrance. Each mat is personal space: ask before moving closer.\n\nCancel in time if you cannot make it: someone on the waitlist wants your spot.' },
    checklist: null, video_label: null },
  { ...base('art_tour', 120), slug: 'tour', section: 'rules', icon: '▶', required: false, sort: 4, published: true, publish_at: null,
    title: { es: 'Tour del estudio', en: 'Studio tour' },
    summary: { es: 'Recepción, casilleros, duchas y la sala.', en: 'Front desk, lockers, showers and the room.' },
    body_md: { es: 'Al entrar está recepción; a la izquierda los casilleros y las duchas; al fondo la sala principal.', en: 'The front desk is at the entrance; lockers and showers to the left; the main room at the back.' },
    checklist: null, video_label: { es: 'Video · tour del estudio · 2:00 (pendiente de grabar)', en: 'Video · studio tour · 2:00 (footage pending)' } },
  { ...base('art_emergencies', 120), slug: 'emergencies', section: 'rules', icon: '✚', required: true, sort: 5, published: true, publish_at: null,
    title: { es: 'Emergencias', en: 'Emergencies' },
    summary: { es: 'Qué hacer y a quién avisar.', en: 'What to do and who to tell.' },
    body_md: { es: 'Si alguien se siente mal, avisa al profesor de inmediato. El botiquín y el desfibrilador están en recepción. Tu contacto de emergencia (perfil) es a quien llamamos.', en: 'If someone feels unwell, tell the teacher immediately. First-aid kit and defibrillator are at the front desk. Your emergency contact (profile) is who we call.' },
    checklist: null, video_label: null },
  { ...base('art_about', 120), slug: 'about', section: 'about', icon: '◎', required: false, sort: 6, published: true, publish_at: null,
    title: { es: 'Sobre HOY', en: 'About HOY' },
    summary: { es: 'Un club humano. La vida es hoy.', en: 'A human club. Life is today.' },
    body_md: { es: 'HOY es un club de bienestar: cuatro movimientos —Enraíza, Fluye, Arde, Libera— y un espacio para practicar sin prisa.\n\nCada clase es para todos los niveles y el profesor adapta la práctica. Lo que cuidamos es el ritmo, no el rendimiento.', en: 'HOY is a wellness club: four movements —Enraíza, Fluye, Arde, Libera— and a space to practise without hurry.\n\nEvery class is all-levels and the teacher adapts the practice. We look after rhythm, not performance.' },
    checklist: null, video_label: null },
];

interface FaqSeed { group: string; page: number; title: { es: string; en: string }; lead: { es: string; en: string }; items: { q: { es: string; en: string }; a: { es: string; en: string } }[] }

const FAQ: FaqSeed[] = [
  { group: 's1', page: 1, title: { es: '01 · Tu primera vez en HOY', en: '01 · Your first time at HOY' }, lead: { es: 'Lo que casi todo el mundo pregunta antes de venir.', en: 'What almost everyone asks before coming.' }, items: [
    { q: { es: '¿Necesito experiencia previa?', en: 'Do I need prior experience?' }, a: { es: 'No. Todas las clases son para todos los niveles y el profesor adapta la práctica.', en: 'No. Every class is all-levels and the teacher adapts the practice.' } },
    { q: { es: '¿Qué llevo?', en: 'What do I bring?' }, a: { es: 'Ropa cómoda, agua y una toalla si es sala caliente. Tenemos mats y bloques.', en: 'Comfortable clothes, water and a towel for the hot room. We have mats and blocks.' } },
    { q: { es: '¿Cuánto antes debo llegar?', en: 'How early should I arrive?' }, a: { es: '10 minutos. La sala cierra al empezar.', en: '10 minutes. The room closes at start time.' } },
    { q: { es: '¿Hay clase de prueba?', en: 'Is there a trial class?' }, a: { es: 'Sí, una por persona. Mírala en Planes → Bienvenida.', en: 'Yes, one per person. See Plans → Welcome.' } },
  ] },
  { group: 's2', page: 1, title: { es: '02 · Reservas y horarios', en: '02 · Bookings and schedule' }, lead: { es: 'Cómo funciona reservar, cancelar y la lista de espera.', en: 'How booking, cancelling and the waitlist work.' }, items: [
    { q: { es: '¿Cuántas clases puedo reservar al día?', en: 'How many classes can I book per day?' }, a: { es: 'Una por persona al día, para que todos tengan cupo.', en: 'One per person per day, so everyone gets a spot.' } },
    { q: { es: '¿Hasta cuándo puedo cancelar?', en: 'Until when can I cancel?' }, a: { es: 'Hasta 2 horas antes sin costo. Dentro de la ventana, el crédito se usa.', en: 'Up to 2 hours before at no cost. Inside the window the credit is spent.' } },
    { q: { es: '¿Cómo funciona la lista de espera?', en: 'How does the waitlist work?' }, a: { es: 'Te avisamos por WhatsApp cuando se libera un cupo y tienes 30 minutos para reclamarlo.', en: 'We message you on WhatsApp when a spot opens and you have 30 minutes to claim it.' } },
  ] },
  { group: 's3', page: 1, title: { es: '03 · Membresías y planes', en: '03 · Memberships and plans' }, lead: { es: 'Los precios viven en Planes; aquí, cómo funcionan.', en: 'Prices live in Plans; here is how they work.' }, items: [
    { q: { es: '¿Puedo pausar mi membresía?', en: 'Can I pause my membership?' }, a: { es: 'Sí, hasta 30 días al año desde Perfil → Membresía. La renovación se corre esos días.', en: 'Yes, up to 30 days a year from Profile → Membership. Renewal shifts by those days.' } },
    { q: { es: '¿Los paquetes vencen?', en: 'Do packs expire?' }, a: { es: 'El de 3 clases dura un mes; el de 10, tres meses. El saldo se ve en Créditos.', en: 'The 3-class pack lasts a month; the 10-class pack three months. See Credits for the balance.' } },
    { q: { es: '¿Cuánto cuesta?', en: 'How much does it cost?' }, a: { es: 'Todos los precios están en Planes, siempre actualizados.', en: 'Every price is in Plans, always current.' } },
  ] },
  { group: 's4', page: 2, title: { es: '04 · El espacio', en: '04 · The space' }, lead: { es: 'Casilleros, duchas y sala caliente.', en: 'Lockers, showers and the hot room.' }, items: [
    { q: { es: '¿Hay duchas y casilleros?', en: 'Are there showers and lockers?' }, a: { es: 'Sí, ambos. Trae tu candado o pide uno en recepción.', en: 'Yes, both. Bring a lock or ask for one at the front desk.' } },
    { q: { es: '¿Qué tan caliente es la sala?', en: 'How hot is the room?' }, a: { es: '36–38 °C en Hot Vinyasa. Las demás clases son a temperatura ambiente.', en: '36–38 °C for Hot Vinyasa. Other classes are at room temperature.' } },
  ] },
  { group: 's5', page: 2, title: { es: '05 · En camino', en: '05 · Getting here' }, lead: { es: 'Cómo llegar y dónde dejar la bici.', en: 'How to get here and where to leave the bike.' }, items: [
    { q: { es: '¿Hay parqueadero?', en: 'Is there parking?' }, a: { es: 'Parqueadero de bicicletas en la entrada; para carro, parqueaderos públicos a una cuadra.', en: 'Bike parking at the entrance; public car parks one block away.' } },
    { q: { es: '¿Cuál es la dirección?', en: 'What is the address?' }, a: { es: 'La encuentras en Más → Contacto y en el sitio web.', en: 'It is under More → Contact and on the website.' } },
  ] },
  { group: 's6', page: 2, title: { es: '06 · Contacto y concierge', en: '06 · Contact and concierge' }, lead: { es: 'Si no está aquí, una persona te responde.', en: 'If it is not here, a person answers.' }, items: [
    { q: { es: '¿Cómo hablo con alguien del estudio?', en: 'How do I reach someone at the studio?' }, a: { es: 'Escríbenos por WhatsApp desde Más; respondemos en horario del estudio.', en: 'Message us on WhatsApp from More; we reply during studio hours.' } },
    { q: { es: '¿Puedo regalar clases?', en: 'Can I gift classes?' }, a: { es: 'Sí, con una tarjeta de regalo desde Más → Tarjeta de regalo.', en: 'Yes, with a gift card from More → Gift card.' } },
    { q: { es: '¿Puedo llevar a alguien?', en: 'Can I bring someone?' }, a: { es: 'Sí. Desde Invitar a alguien envías un pase de invitado; el estudio lo reconoce con tu código.', en: 'Yes. From Invite a guest you send a guest pass; the studio honours it with your code.' } },
  ] },
];

export const faqEntries: FaqEntryRow[] = FAQ.flatMap((s, si) => s.items.map((it, i) => ({
  ...base(`faq_${s.group}_${i + 1}`, 120), group_key: s.group, group_title: s.title, group_lead: s.lead, page: s.page,
  question: it.q, answer: it.a, sort: si * 10 + i + 1, published: true,
})));

/** Upcoming events, relative to "today" so C-23 always has something to show. */
const at = (daysAhead: number, hh: number) => { const d = new Date(NOW); d.setDate(d.getDate() + daysAhead); d.setHours(hh, 0, 0, 0); return d; };
const span = (from: Date, minutes: number) => iso(new Date(from.getTime() + minutes * MS.min));

export const events: EventRow[] = [
  { ...base('evt_sound_bath', 20), slug: 'sound-bath-luna-llena', status: 'published', room_id: 'room_main', host_teacher_id: 'tea_santiago', capacity: 24, price_cop: price('single'), member_price_cop: 0, cover_key: 'events/sound-bath',
    title: { es: 'Baño de sonido · Luna llena', en: 'Full Moon Sound Bath' }, kind: { es: 'Baño de sonido', en: 'Sound bath' },
    description: { es: 'Noventa minutos de cuencos, gongs y respiración guiada. Llega con ropa abrigada: el cuerpo se enfría al quedarse quieto.', en: 'Ninety minutes of bowls, gongs and guided breath. Bring warm layers: the body cools down when it stays still.' },
    bring: [{ es: 'Cobija o manta', en: 'Blanket' }, { es: 'Ropa abrigada', en: 'Warm layers' }],
    starts_at: iso(at(9, 19)), ends_at: span(at(9, 19), 90) },
  { ...base('evt_breath_workshop', 15), slug: 'taller-respiracion', status: 'published', room_id: 'room_main', host_teacher_id: 'tea_felipe', capacity: 15, price_cop: price('single'), member_price_cop: price('single'), cover_key: 'events/breathwork',
    title: { es: 'Taller de respiración', en: 'Breathwork workshop' }, kind: { es: 'Taller', en: 'Workshop' },
    description: { es: 'Pranayama para gente ocupada: tres técnicas que caben en un día de trabajo.', en: 'Pranayama for busy people: three techniques that fit a working day.' },
    bring: [{ es: 'Cuaderno', en: 'Notebook' }],
    starts_at: iso(at(16, 10)), ends_at: span(at(16, 10), 120) },
  { ...base('evt_inversions', 10), slug: 'masterclass-inversiones', status: 'published', room_id: 'room_main', host_teacher_id: 'tea_isabela', capacity: 12, price_cop: price('pack3'), member_price_cop: price('single'), cover_key: 'events/inversions',
    title: { es: 'Masterclass de inversiones', en: 'Inversions masterclass' }, kind: { es: 'Masterclass', en: 'Masterclass' },
    description: { es: 'Tres horas sobre la pared: parada de manos, antebrazos y cabeza, con asistencia individual y progresiones para cada cuerpo.', en: 'Three hours at the wall: handstand, forearm stand and headstand, with hands-on assistance and progressions for every body.' },
    bring: [{ es: 'Toalla', en: 'Towel' }, { es: 'Medias antideslizantes (opcional)', en: 'Grip socks (optional)' }],
    starts_at: iso(at(23, 9)), ends_at: span(at(23, 9), 180) },
];
