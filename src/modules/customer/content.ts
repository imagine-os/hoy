/**
 * Static content for C-13 (club rules), C-14/C-15 (FAQ) and C-23 (events) until the CMS tables exist
 * (content_articles, faq_entries, events — see shared-change requests in docs/changelog/0002-customer-app.md).
 * Every entry is ES + EN. Anything about prices links to /app/plans instead of repeating a figure.
 */
import type { Bi } from '../../specs/types';

export interface Article { slug: string; icon: string; title: Bi; summary: Bi; body: Bi[]; checklist?: Bi[]; video?: Bi; locked?: boolean }

export const rulesArticles: Article[] = [
  { slug: 'hot-room', icon: '♨', title: { es: 'Seguridad en sala caliente', en: 'Hot room safety' }, summary: { es: 'Hidratación, señales del cuerpo y cuándo parar.', en: 'Hydration, body signals and when to stop.' },
    body: [{ es: 'La sala se calienta a 36–38 °C. Es normal sudar mucho; no es normal sentir mareo, náusea o frío repentino. Si pasa, siéntate o acuéstate y avisa al profesor.', en: 'The room is heated to 36–38 °C. Sweating a lot is normal; dizziness, nausea or sudden chills are not. If it happens, sit or lie down and tell the teacher.' }, { es: 'Toma agua antes, durante y después. Evita comer pesado en las dos horas previas.', en: 'Drink water before, during and after. Avoid a heavy meal in the two hours before.' }],
    checklist: [{ es: 'Toalla grande para el mat', en: 'Large towel for the mat' }, { es: 'Botella de agua (mínimo 500 ml)', en: 'Water bottle (at least 500 ml)' }, { es: 'Ropa ligera y transpirable', en: 'Light, breathable clothing' }] },
  { slug: 'preparation', icon: '◔', title: { es: 'Preparación para la clase', en: 'Class preparation' }, summary: { es: 'Qué traer y cuándo llegar.', en: 'What to bring and when to arrive.' },
    body: [{ es: 'Llega 10 minutos antes. La puerta de la sala se cierra al empezar para cuidar la energía del grupo.', en: 'Arrive 10 minutes early. The room door closes at start time to protect the group’s focus.' }, { es: 'Hay mats y bloques en el estudio; si prefieres el tuyo, tráelo.', en: 'Mats and blocks are available; bring your own if you prefer.' }],
    checklist: [{ es: 'Reserva confirmada en la app', en: 'Booking confirmed in the app' }, { es: 'Llegar 10 min antes', en: 'Arrive 10 min early' }, { es: 'Teléfono en silencio en el casillero', en: 'Phone silenced, in the locker' }] },
  { slug: 'etiquette', icon: '☼', title: { es: 'Etiqueta del estudio', en: 'Studio etiquette' }, summary: { es: 'Silencio, espacio y respeto.', en: 'Silence, space and respect.' },
    body: [{ es: 'Hablamos bajo en la sala y dejamos los zapatos en la entrada. Cada mat es un espacio propio: pide permiso antes de acercarte.', en: 'We speak softly in the room and leave shoes at the entrance. Each mat is personal space: ask before moving closer.' }, { es: 'Cancela con tiempo si no vas a venir: alguien en lista de espera quiere tu cupo.', en: 'Cancel in time if you cannot make it: someone on the waitlist wants your spot.' }] },
  { slug: 'tour', icon: '▶', title: { es: 'Tour del estudio', en: 'Studio tour' }, summary: { es: 'Recepción, casilleros, duchas y la sala.', en: 'Front desk, lockers, showers and the room.' }, video: { es: 'Video · tour del estudio · 2:00 (pendiente de grabar)', en: 'Video · studio tour · 2:00 (footage pending)' },
    body: [{ es: 'Al entrar está recepción; a la izquierda los casilleros y las duchas; al fondo la sala principal con 15 mats.', en: 'The front desk is at the entrance; lockers and showers to the left; the main room with 15 mats at the back.' }] },
  { slug: 'emergencies', icon: '✚', title: { es: 'Emergencias', en: 'Emergencies' }, summary: { es: 'Qué hacer y a quién avisar.', en: 'What to do and who to tell.' }, locked: true,
    body: [{ es: 'Si alguien se siente mal, avisa al profesor de inmediato. El botiquín y el desfibrilador están en recepción. Tu contacto de emergencia (perfil) es a quien llamamos.', en: 'If someone feels unwell, tell the teacher immediately. First-aid kit and defibrillator are at the front desk. Your emergency contact (profile) is who we call.' }] },
  { slug: 'about', icon: '◎', title: { es: 'Sobre HOY', en: 'About HOY' }, summary: { es: 'Un club humano. La vida es hoy.', en: 'A human club. Life is today.' },
    body: [{ es: 'HOY es un club de bienestar: cuatro movimientos —Enraíza, Fluye, Arde, Libera— y un espacio para practicar sin prisa.', en: 'HOY is a wellness club: four movements —Enraíza, Fluye, Arde, Libera— and a space to practise without hurry.' }] },
];

export interface FaqSection { id: string; title: Bi; lead: Bi; items: { id: string; q: Bi; a: Bi }[] }

export const faqPages: FaqSection[][] = [
  [
    { id: 's1', title: { es: '01 · Tu primera vez en HOY', en: '01 · Your first time at HOY' }, lead: { es: 'Lo que casi todo el mundo pregunta antes de venir.', en: 'What almost everyone asks before coming.' }, items: [
      { id: 'q1', q: { es: '¿Necesito experiencia previa?', en: 'Do I need prior experience?' }, a: { es: 'No. Todas las clases son para todos los niveles y el profesor adapta la práctica.', en: 'No. Every class is all-levels and the teacher adapts the practice.' } },
      { id: 'q2', q: { es: '¿Qué llevo?', en: 'What do I bring?' }, a: { es: 'Ropa cómoda, agua y una toalla si es sala caliente. Tenemos mats y bloques.', en: 'Comfortable clothes, water and a towel for the hot room. We have mats and blocks.' } },
      { id: 'q3', q: { es: '¿Cuánto antes debo llegar?', en: 'How early should I arrive?' }, a: { es: '10 minutos. La sala cierra al empezar.', en: '10 minutes. The room closes at start time.' } },
      { id: 'q4', q: { es: '¿Hay clase de prueba?', en: 'Is there a trial class?' }, a: { es: 'Sí, una por persona. Mírala en Planes → Bienvenida.', en: 'Yes, one per person. See Plans → Welcome.' } },
    ] },
    { id: 's2', title: { es: '02 · Reservas y horarios', en: '02 · Bookings and schedule' }, lead: { es: 'Cómo funciona reservar, cancelar y la lista de espera.', en: 'How booking, cancelling and the waitlist work.' }, items: [
      { id: 'q5', q: { es: '¿Cuántas clases puedo reservar al día?', en: 'How many classes can I book per day?' }, a: { es: 'Una por persona al día, para que todos tengan cupo.', en: 'One per person per day, so everyone gets a spot.' } },
      { id: 'q6', q: { es: '¿Hasta cuándo puedo cancelar?', en: 'Until when can I cancel?' }, a: { es: 'Hasta 2 horas antes sin costo. Dentro de la ventana, el crédito se usa.', en: 'Up to 2 hours before at no cost. Inside the window the credit is spent.' } },
      { id: 'q7', q: { es: '¿Cómo funciona la lista de espera?', en: 'How does the waitlist work?' }, a: { es: 'Te avisamos por WhatsApp cuando se libera un cupo y tienes 30 minutos para reclamarlo.', en: 'We message you on WhatsApp when a spot opens and you have 30 minutes to claim it.' } },
    ] },
    { id: 's3', title: { es: '03 · Membresías y planes', en: '03 · Memberships and plans' }, lead: { es: 'Los precios viven en Planes; aquí, cómo funcionan.', en: 'Prices live in Plans; here is how they work.' }, items: [
      { id: 'q8', q: { es: '¿Puedo pausar mi membresía?', en: 'Can I pause my membership?' }, a: { es: 'Sí, hasta 30 días al año desde Perfil → Membresía. La renovación se corre esos días.', en: 'Yes, up to 30 days a year from Profile → Membership. Renewal shifts by those days.' } },
      { id: 'q9', q: { es: '¿Los paquetes vencen?', en: 'Do packs expire?' }, a: { es: 'El de 3 clases dura un mes; el de 10, tres meses. El saldo se ve en Créditos.', en: 'The 3-class pack lasts a month; the 10-class pack three months. See Credits for the balance.' } },
      { id: 'q10', q: { es: '¿Cuánto cuesta?', en: 'How much does it cost?' }, a: { es: 'Todos los precios están en Planes, siempre actualizados.', en: 'Every price is in Plans, always current.' } },
    ] },
  ],
  [
    { id: 's4', title: { es: '04 · El espacio', en: '04 · The space' }, lead: { es: 'Casilleros, duchas y sala caliente.', en: 'Lockers, showers and the hot room.' }, items: [
      { id: 'q11', q: { es: '¿Hay duchas y casilleros?', en: 'Are there showers and lockers?' }, a: { es: 'Sí, ambos. Trae tu candado o pide uno en recepción.', en: 'Yes, both. Bring a lock or ask for one at the front desk.' } },
      { id: 'q12', q: { es: '¿Qué tan caliente es la sala?', en: 'How hot is the room?' }, a: { es: '36–38 °C en Hot Vinyasa. Las demás clases son a temperatura ambiente.', en: '36–38 °C for Hot Vinyasa. Other classes are at room temperature.' } },
    ] },
    { id: 's5', title: { es: '05 · En camino', en: '05 · Getting here' }, lead: { es: 'Cómo llegar y dónde dejar la bici.', en: 'How to get here and where to leave the bike.' }, items: [
      { id: 'q13', q: { es: '¿Hay parqueadero?', en: 'Is there parking?' }, a: { es: 'Parqueadero de bicicletas en la entrada; para carro, parqueaderos públicos a una cuadra.', en: 'Bike parking at the entrance; public car parks one block away.' } },
      { id: 'q14', q: { es: '¿Cuál es la dirección?', en: 'What is the address?' }, a: { es: 'La encuentras en Más → Contacto y en el sitio web.', en: 'It is under More → Contact and on the website.' } },
    ] },
    { id: 's6', title: { es: '06 · Contacto y concierge', en: '06 · Contact and concierge' }, lead: { es: 'Si no está aquí, una persona te responde.', en: 'If it is not here, a person answers.' }, items: [
      { id: 'q15', q: { es: '¿Cómo hablo con alguien del estudio?', en: 'How do I reach someone at the studio?' }, a: { es: 'Escríbenos por WhatsApp desde Más; respondemos en horario del estudio.', en: 'Message us on WhatsApp from More; we reply during studio hours.' } },
      { id: 'q16', q: { es: '¿Puedo regalar clases?', en: 'Can I gift classes?' }, a: { es: 'Sí, con una tarjeta de regalo desde Más → Tarjeta de regalo.', en: 'Yes, with a gift card from More → Gift card.' } },
    ] },
  ],
];

export interface DemoEvent { id: string; title: Bi; kind: Bi; hostTeacherId: string; startsAt: string; durationMin: number; capacity: number; taken: number; body: Bi; bring: Bi[]; publicPriceId: string; memberIncluded: boolean }

const at = (daysAhead: number, hh: number) => { const d = new Date(); d.setDate(d.getDate() + daysAhead); d.setHours(hh, 0, 0, 0); return d.toISOString(); };

export const demoEvents: DemoEvent[] = [
  { id: 'evt_sound_bath', title: { es: 'Baño de sonido · Luna llena', en: 'Full Moon Sound Bath' }, kind: { es: 'Baño de sonido', en: 'Sound bath' }, hostTeacherId: 'tea_santiago', startsAt: at(9, 19), durationMin: 90, capacity: 24, taken: 15,
    body: { es: 'Noventa minutos de cuencos, gongs y respiración guiada. Llega con ropa abrigada: el cuerpo se enfría al quedarse quieto.', en: 'Ninety minutes of bowls, gongs and guided breath. Bring warm layers: the body cools down when it stays still.' },
    bring: [{ es: 'Cobija o manta', en: 'Blanket' }, { es: 'Ropa abrigada', en: 'Warm layers' }], publicPriceId: 'single', memberIncluded: true },
  { id: 'evt_breath_workshop', title: { es: 'Taller de respiración', en: 'Breathwork workshop' }, kind: { es: 'Taller', en: 'Workshop' }, hostTeacherId: 'tea_felipe', startsAt: at(16, 10), durationMin: 120, capacity: 15, taken: 6,
    body: { es: 'Pranayama para gente ocupada: tres técnicas que caben en un día de trabajo.', en: 'Pranayama for busy people: three techniques that fit a working day.' },
    bring: [{ es: 'Cuaderno', en: 'Notebook' }], publicPriceId: 'single', memberIncluded: false },
];
