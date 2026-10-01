/**
 * Brand content — the studio's own words, as typed data.
 *
 * Sources: the owner's brand PDF "Contenido de marca — Sobre nosotros, filosofía y clases" (Medellín · 2026)
 * for the manifesto and "Sobre HOY"; since 0051 the verified "WEBSITE MODIF" brief (2026-10-01) for the
 * philosophy, the "Nuestras clases" introduction and the seven classes (Ligereza, Híbrido, Fuego, Sólido,
 * Centro, Alineación, Pulso — each with its concept, intention, keys, messages and method, transcribed from the
 * owner's class cards). Spanish is the original; English is a written translation, not a literal one. This is
 * the ONLY place the manifesto, the "Sobre HOY" text, the philosophy, the class texts and the taglines are
 * written — pages read them, they are never re-typed in a page.
 *
 * Prices live in ./pricing.ts, physical facts in ./tenant.ts. Nothing here repeats either.
 */
import type { Bi } from '../specs/types';
import type { Tone } from '../design/tokens';

/** The slugs the site routes on: /site/classes/:slug. One per class, in the owner's order. */
export type ClassSlug = 'ligereza' | 'hibrido' | 'fuego' | 'solido' | 'centro' | 'alineacion' | 'pulso';

/** Things to bring, as keys the website resolves through `site.classes.bring.*` (0051: the FAQ's list). */
export type BringKey = 'props' | 'towel' | 'water';

/** How hard a class works, as the owner's cards say it ("Baja", "Media", "Media-alta", "Alta"). */
export type Intensity = 'low' | 'medium' | 'mediumHigh' | 'high';

export interface BrandClass {
  /** Display name — a brand name, the same in both languages. */
  name: Bi;
  /** The class in one first-person line ("Suelto lo que no me sirve"). */
  tagline: Bi;
  /** Three or four words for the home arches and the cards (the brief's "keywords"). */
  keywords: Bi[];
  /** "Concepto" — one sentence of nouns. */
  concept: Bi;
  /** "Intención" — the quote the class is built around. */
  intention: Bi;
  /** "Clave" — the four chips. */
  keys: Bi[];
  /** "Mensajes" — four lines a teacher can say. */
  messages: Bi[];
  /** "Método" — what the class combines. */
  method: Bi;
  /** The rest of the method line (intensity, closing). */
  methodNote: Bi;
  intensity: Intensity;
  /** Colour tone of this class on arches, chips and calendar marks (D-01 `classTones`); a hue name, never shown as a word. */
  tone: Tone;
  /** `modalities.slug` values this class covers, so the essay joins the schedule rows (duration, intensity). */
  modalitySlugs: string[];
  /** True when the room is heated. No class is heated since 0051 (hot yoga is not on the launch list). */
  heated: boolean;
  bring: BringKey[];
}

/** Page 1 — the cover. */
export const manifesto = {
  eyebrow: { es: 'Medellín · 2026', en: 'Medellín · 2026' },
  /** The cover line, split so a page can emphasise the last sentence. */
  lead: {
    es: 'Todo lo que fue, ya pasó. Todo lo que viene, todavía no está aquí.',
    en: 'Everything that was is already behind you. Everything to come is not here yet.',
  } satisfies Bi,
  emphasis: { es: 'Esto es HOY.', en: 'This is HOY.' } satisfies Bi,
  /** The whole line, for places that want one string. */
  line: {
    es: 'Todo lo que fue, ya pasó. Todo lo que viene, todavía no está aquí. Esto es HOY.',
    en: 'Everything that was is already behind you. Everything to come is not here yet. This is HOY.',
  } satisfies Bi,
  footer: {
    es: 'Contenido de marca — Sobre nosotros, filosofía y clases',
    en: 'Brand content — About us, philosophy and classes',
  } satisfies Bi,
} as const;

/** Page 2 — "Sobre HOY". */
export const about = {
  eyebrow: { es: 'Quiénes somos', en: 'Who we are' } satisfies Bi,
  title: { es: 'Sobre HOY', en: 'About HOY' } satisfies Bi,
  paragraphs: [
    {
      es: 'HOY nace de una idea simple: la vida está pasando ahora. En medio del ritmo cotidiano de Medellín, el tráfico, el trabajo, la lista de pendientes, HOY crea un espacio para detenerte, respirar, moverte, sentir y volver a ti.',
      en: 'HOY grew out of a simple idea: life is happening now. In the middle of Medellín’s everyday rhythm — the traffic, the work, the to-do list — HOY makes a space to stop, breathe, move, feel and come back to yourself.',
    },
    {
      es: 'No buscamos que escapes de tu rutina. Buscamos que la habites de otra manera: con más presencia, más conciencia y más conexión. Por eso HOY no es un gimnasio más ni un estudio de yoga como los que ya conoces, es un santuario urbano, hecho para que el bienestar deje de ser una meta lejana y se vuelva parte de tu día a día.',
      en: 'We are not here to help you escape your routine. We want you to inhabit it differently: with more presence, more awareness, more connection. That is why HOY is not one more gym, and not a yoga studio like the ones you already know — it is an urban sanctuary, built so wellbeing stops being a distant goal and becomes part of your ordinary day.',
    },
    {
      es: 'Aquí no hay una sola forma de llegar. Vivimos el momento con atención, sin adelantarnos a lo que viene ni quedarnos en lo que ya pasó, y te invitamos a hacer lo mismo: solo necesitas llegar, sin experiencia previa ni un camino de bienestar ya recorrido. Nuestros maestros te acompañan desde ahí, con la cercanía de quien entiende que el verdadero progreso empieza por aceptar dónde estás hoy.',
      en: 'There is no single way to arrive. We live this moment with attention, without running ahead to what is coming or staying behind in what is already gone — and we invite you to do the same. All you need is to show up, with no previous experience and no wellness path already walked. Our teachers meet you right there, with the closeness of people who understand that real progress starts by accepting where you are today.',
    },
    {
      es: 'Si nunca has practicado, si ya lo has hecho toda tu vida, o si solo necesitas quince minutos entre reuniones para bajar el ritmo: HOY es para ti. No tienes que cambiar tu vida para venir. Solo tienes que volver a este momento. Porque todo empieza HOY.',
      en: 'If you have never practised, if you have practised all your life, or if you just need fifteen minutes between meetings to slow down: HOY is for you. You do not have to change your life to come here. You only have to come back to this moment. Because everything starts HOY.',
    },
    {
      es: 'Conocer HOY es solo el primer paso. El siguiente es sentirlo: una clase de prueba, sin complicaciones, para que decidas con el cuerpo y no solo con la cabeza. Descubre nuestros planes y encuentra la puerta de entrada que más te acomode.',
      en: 'Getting to know HOY is only the first step. The next one is feeling it: a trial class, no complications, so you decide with your body and not only with your head. Look through our plans and find the way in that suits you best.',
    },
  ] satisfies Bi[],
  /**
   * The brand's personality, as the 2026 brand manual ("Manual de marca", slide 6) names it: five
   * traits (0032 — was four words, Humana · Cercana · Directa · Presente, from the earlier brief;
   * "directa" now lives inside "Cercana").
   */
  values: [
    { es: 'Presente', en: 'Present' },
    { es: 'Humana', en: 'Human' },
    { es: 'Cercana', en: 'Close' },
    { es: 'Sensorial', en: 'Sensory' },
    { es: 'Contemporánea', en: 'Contemporary' },
  ] satisfies Bi[],
} as const;

/** "La filosofía de HOY" — the About page's dark panel (0051, verified copy). */
export const philosophy = {
  eyebrow: { es: 'Cómo pensamos', en: 'How we think' } satisfies Bi,
  title: { es: 'La filosofía de HOY', en: 'The HOY philosophy' } satisfies Bi,
  sections: [
    {
      title: { es: 'Nuestra filosofía', en: 'Our philosophy' },
      paragraphs: [{
        es: 'Creamos experiencias que transformen el bienestar en una forma de vivir: más consciente, presente y conectada. No venimos a entrenar cuerpos. Venimos a despertar presencia.',
        en: 'We create experiences that turn wellbeing into a way of living: more aware, more present, more connected. We are not here to train bodies. We are here to awaken presence.',
      }],
    },
    {
      title: { es: 'Nuestro propósito', en: 'Our purpose' },
      paragraphs: [{
        es: 'Hacer del movimiento y la respiración un camino para volver a nosotros mismos y habitar el presente. En HOY, cuerpo, mente y espíritu se integran. El movimiento es la herramienta física. La pausa es el espacio consciente. La energía es la vitalidad que despierta. Y el equilibrio es la sabiduría que sostiene.',
        en: 'To make movement and breath a way back to ourselves and into the present. At HOY, body, mind and spirit come together. Movement is the physical tool. The pause is the conscious space. Energy is the vitality that wakes up. And balance is the wisdom that holds it all.',
      }],
    },
  ] satisfies { title: Bi; paragraphs: Bi[] }[],
  /** The closing lines, printed after the two sections. */
  closing: {
    es: 'Todo empieza con una pregunta: ¿cómo vuelvo a mí? Cada clase es un camino diferente hacia la misma verdad: tu presencia es tu poder.',
    en: 'It all starts with one question: how do I come back to myself? Every class is a different path to the same truth: your presence is your power.',
  } satisfies Bi,
  /** The pull-quote a page prints large. */
  pullQuote: {
    es: 'No venimos a entrenar cuerpos. Venimos a despertar presencia.',
    en: 'We are not here to train bodies. We are here to awaken presence.',
  } satisfies Bi,
} as const;

/** "Nuestras clases" — the W-07 introduction (0051, verified copy). */
export const classesIntro = {
  eyebrow: { es: 'Cómo te mueves en HOY', en: 'How you move at HOY' } satisfies Bi,
  title: { es: 'Nuestras clases', en: 'Our classes' } satisfies Bi,
  lead: {
    es: 'HOY no es un estudio de Pilates y Yoga. Es un espacio donde el movimiento es la puerta para volver a tu presencia.',
    en: 'HOY is not a Pilates and Yoga studio. It is a space where movement is the door back to your presence.',
  } satisfies Bi,
  /** Printed large, between the lead and the paragraphs. */
  statement: {
    es: 'No venimos a entrenar cuerpos. Venimos a despertar presencia.',
    en: 'We are not here to train bodies. We are here to awaken presence.',
  } satisfies Bi,
  paragraphs: [
    {
      es: 'Tenemos siete clases, y cada una es un camino distinto. Algunas te dan base y fuerza. Otras te encienden. Otras te centran, te hacen sentir cada detalle, te ayudan a soltar o a entender cómo funciona tu cuerpo. Todas llegan al mismo lugar: aquí, ahora.',
      en: 'We have seven classes, and each one is a different path. Some give you a base and strength. Others light you up. Others centre you, make you feel every detail, help you let go or understand how your body works. They all arrive at the same place: here, now.',
    },
    {
      es: 'Nuestras clases son retadoras y se hacen con la alineación correcta. El trabajo muscular es intenso y tiene un protocolo de cuidado. Conocemos tu cuerpo gracias a una ficha técnica personal, así que el movimiento es inteligente, informado y hecho para ti. Vas a ver resultados físicos sin dejar de lado tu bienestar.',
      en: 'Our classes are challenging and done with the right alignment. The muscular work is intense and follows a care protocol. We know your body through a personal technical record, so the movement is intelligent, informed and made for you. You will see physical results without setting your wellbeing aside.',
    },
    {
      es: 'Aquí el movimiento es la herramienta. La pausa es el espacio para darte cuenta. La energía es lo que despierta. El equilibrio es lo que te sostiene.',
      en: 'Here, movement is the tool. The pause is the space to notice. Energy is what wakes up. Balance is what holds you.',
    },
  ] satisfies Bi[],
  question: { es: 'Todo empieza con una pregunta: ¿cómo vuelvo a mí?', en: 'It all starts with one question: how do I come back to myself?' } satisfies Bi,
  close: { es: 'Elige tu camino. Tu presencia es tu poder.', en: 'Choose your path. Your presence is your power.' } satisfies Bi,
  /** The home page's sub-head under the statement. */
  methods: {
    es: 'Siete metodologías que combinan Pilates, Yoga, Barre, movilidad, fuerza, cardio y respiración, con diferentes niveles de intensidad.',
    en: 'Seven methodologies that combine Pilates, Yoga, Barre, mobility, strength, cardio and breathwork, at different levels of intensity.',
  } satisfies Bi,
} as const;

const b = (es: string, en: string): Bi => ({ es, en });
const ALL_BRING: BringKey[] = ['props', 'towel', 'water'];

/** The seven classes, from the owner's class cards (0051). Keyed by route slug. */
export const classes: Record<ClassSlug, BrandClass> = {
  ligereza: {
    name: b('Ligereza', 'Ligereza'),
    tagline: b('Suelto lo que no me sirve', 'I let go of what I don’t need'),
    keywords: [b('liberación', 'release'), b('apertura', 'opening'), b('fluidez', 'flow'), b('movimiento consciente', 'conscious movement')],
    concept: b('Liberación. Apertura. Fluidez. Movimiento consciente.', 'Release. Opening. Flow. Conscious movement.'),
    intention: b('Mi cuerpo se mueve libremente. Suelto lo que no me sirve. Estoy en paz y en movimiento.', 'My body moves freely. I let go of what I don’t need. I am at peace and in motion.'),
    keys: [b('Liberación', 'Release'), b('Movilidad', 'Mobility'), b('Paz', 'Peace'), b('Consciencia', 'Awareness')],
    messages: [b('Suelta tensiones guardadas', 'Let go of stored tension'), b('Abre espacios cerrados', 'Open closed spaces'), b('Sales más ligero', 'You leave lighter'), b('Tu cuerpo respira', 'Your body breathes')],
    method: b('Movilidad + Stretching + Yoga yin', 'Mobility + Stretching + Yin yoga'),
    methodNote: b('Baja intensidad. Savasana de 3 a 4 minutos.', 'Low intensity. A 3 to 4 minute savasana.'),
    intensity: 'low', tone: 'river', modalitySlugs: ['ligereza'], heated: false, bring: ALL_BRING,
  },
  hibrido: {
    name: b('Híbrido', 'Híbrido'),
    tagline: b('Soy fuerte y flexible', 'I am strong and flexible'),
    keywords: [b('fusión', 'fusion'), b('completitud', 'wholeness'), b('balance', 'balance')],
    concept: b('Fusión. Completitud. Balance. Lo mejor de ambos mundos.', 'Fusion. Wholeness. Balance. The best of both worlds.'),
    intention: b('Soy fuerte y flexible. Estoy completo. Mi cuerpo es inteligente y adaptable.', 'I am strong and flexible. I am whole. My body is intelligent and adaptable.'),
    keys: [b('Fusión', 'Fusion'), b('Fuerza', 'Strength'), b('Flexibilidad', 'Flexibility'), b('Equilibrio', 'Balance')],
    messages: [b('Fuerte y flexible a la vez', 'Strong and flexible at once'), b('Aquí somos completos', 'Here we are whole'), b('Lo mejor de dos mundos', 'The best of two worlds'), b('Te sientes entero', 'You feel whole')],
    method: b('Pilates + Yoga dinámico', 'Pilates + Dynamic yoga'),
    methodNote: b('Media intensidad. Movimiento consciente.', 'Medium intensity. Conscious movement.'),
    intensity: 'medium', tone: 'plum', modalitySlugs: ['hibrido'], heated: false, bring: ALL_BRING,
  },
  fuego: {
    name: b('Fuego', 'Fuego'),
    tagline: b('Enciende tu energía', 'Light up your energy'),
    keywords: [b('encendimiento', 'ignition'), b('despertar', 'awakening'), b('energía vital', 'life energy')],
    concept: b('Encendimiento. Despertar. Energía vital desatada.', 'Ignition. Awakening. Life energy set free.'),
    intention: b('Estoy encendido. Mis células vibran con presencia. Mis movimientos tienen fuego.', 'I am lit up. My cells vibrate with presence. My movements have fire.'),
    keys: [b('Energía', 'Energy'), b('Ritmo', 'Rhythm'), b('Cardio', 'Cardio'), b('Vitalidad', 'Vitality')],
    messages: [b('Encenderás tu energía', 'You will light up your energy'), b('Aquí el ritmo te lleva', 'Here the rhythm carries you'), b('Termina sintiéndote imparable', 'Finish feeling unstoppable'), b('Tu fuego es tuyo', 'Your fire is yours')],
    method: b('Pilates dinámico + Rumba', 'Dynamic pilates + Rumba'),
    methodNote: b('Alta intensidad. Sin descanso.', 'High intensity. No rest.'),
    intensity: 'high', tone: 'clay', modalitySlugs: ['fuego'], heated: false, bring: ALL_BRING,
  },
  solido: {
    name: b('Sólido', 'Sólido'),
    tagline: b('Tu base se construye desde adentro', 'Your base is built from within'),
    keywords: [b('enraizamiento', 'rooting'), b('solidez', 'solidity'), b('construcción', 'building')],
    concept: b('Enraizamiento. Construcción. Solidez desde adentro.', 'Rooting. Building. Solidity from within.'),
    intention: b('Cada movimiento me ancla. Construyo desde mi centro. Estoy enraizado en mi fuerza.', 'Every movement anchors me. I build from my centre. I am rooted in my strength.'),
    keys: [b('Enraizamiento', 'Rooting'), b('Base', 'Base'), b('Control', 'Control'), b('Precisión', 'Precision')],
    messages: [b('Construye tu casa desde adentro', 'Build your house from within'), b('No necesitas lo más difícil', 'You don’t need the hardest thing'), b('Llevas esta solidez contigo', 'You carry this solidity with you'), b('Tu poder comienza aquí', 'Your power starts here')],
    method: b('Pilates + pesas y resistencia', 'Pilates + weights and resistance'),
    methodNote: b('Full body. Intensidad media-alta.', 'Full body. Medium-high intensity.'),
    intensity: 'mediumHigh', tone: 'slate', modalitySlugs: ['solido'], heated: false, bring: ALL_BRING,
  },
  centro: {
    name: b('Centro', 'Centro'),
    tagline: b('Estoy aquí, ahora', 'I am here, now'),
    keywords: [b('presencia', 'presence'), b('anclaje', 'anchoring'), b('silencio', 'silence')],
    concept: b('Presencia. Anclaje. Silencio profundo. Vuelta a ti.', 'Presence. Anchoring. Deep silence. Back to yourself.'),
    intention: b('Estoy aquí. Mi respiración es mi ancla. El ahora es mi verdad. Vuelvo a mí.', 'I am here. My breath is my anchor. Now is my truth. I come back to myself.'),
    keys: [b('Presencia', 'Presence'), b('Respiración', 'Breath'), b('Paz', 'Peace'), b('Interiorización', 'Turning inward')],
    messages: [b('Aquí no hay prisas', 'There is no rush here'), b('El silencio sana', 'Silence heals'), b('Tu respiración te ancla', 'Your breath anchors you'), b('Sales renovado', 'You leave renewed')],
    method: b('Meditación + Respiración consciente + Sound healing', 'Meditation + Conscious breathing + Sound healing'),
    methodNote: b('Savasana profunda.', 'A deep savasana.'),
    intensity: 'low', tone: 'moss', modalitySlugs: ['centro'], heated: false, bring: ALL_BRING,
  },
  alineacion: {
    name: b('Alineación', 'Alineación'),
    tagline: b('Entiendo cómo funciono', 'I understand how I work'),
    keywords: [b('movimiento inteligente', 'intelligent movement'), b('funcionalidad', 'function')],
    concept: b('Inteligencia. Funcionalidad. Biomecánica clara. Movimiento inteligente.', 'Intelligence. Function. Clear biomechanics. Intelligent movement.'),
    intention: b('Mi cuerpo se alinea con inteligencia. Entiendo cómo funciono. Practico consciente.', 'My body aligns with intelligence. I understand how I work. I practise with awareness.'),
    keys: [b('Inteligencia', 'Intelligence'), b('Alineación', 'Alignment'), b('Funcional', 'Functional'), b('Consciencia', 'Awareness')],
    messages: [b('Tu cuerpo es inteligente', 'Your body is intelligent'), b('Practicas consciente', 'You practise with awareness'), b('Comprendes tu biomecánica', 'You understand your biomechanics'), b('Te mueves con propósito', 'You move with purpose')],
    method: b('Yoga dinámico funcional + Vinyasas', 'Functional dynamic yoga + Vinyasas'),
    methodNote: b('Media intensidad. Savasana de 3 a 4 minutos.', 'Medium intensity. A 3 to 4 minute savasana.'),
    intensity: 'medium', tone: 'sage', modalitySlugs: ['alineacion'], heated: false, bring: ALL_BRING,
  },
  pulso: {
    name: b('Pulso', 'Pulso'),
    tagline: b('Siento cada fibra de mi ser', 'I feel every fibre of my being'),
    keywords: [b('sensibilidad', 'sensitivity'), b('micro-movimientos', 'micro-movements'), b('inteligencia muscular', 'muscle intelligence')],
    concept: b('Sensibilidad. Micro-movimientos. Inteligencia muscular profunda.', 'Sensitivity. Micro-movements. Deep muscle intelligence.'),
    intention: b('Siento cada fibra de mi ser. Mi cuerpo late con presencia. Estoy vivo en cada célula.', 'I feel every fibre of my being. My body beats with presence. I am alive in every cell.'),
    keys: [b('Precisión', 'Precision'), b('Escucha', 'Listening'), b('Detalle', 'Detail'), b('Pulso', 'Pulse')],
    messages: [b('La magia está en lo pequeño', 'The magic is in the small things'), b('Requiere atención profunda', 'It asks for deep attention'), b('Tu cuerpo tiene inteligencia', 'Your body has intelligence'), b('Eso no desaparece', 'That does not go away')],
    method: b('Barre + isometrías + pulsos', 'Barre + isometrics + pulses'),
    methodNote: b('Media intensidad. Concentración total.', 'Medium intensity. Total focus.'),
    intensity: 'medium', tone: 'sun', modalitySlugs: ['pulso'], heated: false, bring: ALL_BRING,
  },
};

/** Route order for the classes page and the home arches — the owner's order. */
export const classOrder: ClassSlug[] = ['ligereza', 'hibrido', 'fuego', 'solido', 'centro', 'alineacion', 'pulso'];

export const taglines = {
  life: { es: 'La vida es HOY.', en: 'Life is HOY.' } satisfies Bi,
  start: { es: 'Todo empieza HOY.', en: 'Everything starts HOY.' } satisfies Bi,
  /** 0051 — the hero line under "Tu espacio, tu tiempo." */
  present: { es: 'Muévete. Respira. Vive el presente.', en: 'Move. Breathe. Live the present.' } satisfies Bi,
} as const;

export const brandClass = (slug: string): BrandClass | undefined =>
  (classOrder as string[]).includes(slug) ? classes[slug as ClassSlug] : undefined;

/** The class a schedule modality belongs to (the join every class mark and thumbnail uses). */
export const classForModality = (modalitySlug: string | undefined): ClassSlug | undefined =>
  modalitySlug ? classOrder.find((s) => classes[s].modalitySlugs.includes(modalitySlug)) : undefined;
