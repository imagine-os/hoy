/**
 * Brand content — the studio's own words, as typed data.
 *
 * Source: the owner's brand PDF "Contenido de marca — Sobre nosotros, filosofía y clases"
 * (Medellín · 2026, 5 pages). Spanish is the original; English is a written translation, not a
 * literal one. This is the ONLY place the manifesto, the "Sobre HOY" text, the philosophy, the
 * class essays and the taglines are written — pages read them, they are never re-typed in a page.
 *
 * Prices live in ./pricing.ts, physical facts in ./tenant.ts. Nothing here repeats either.
 */
import type { Bi } from '../specs/types';
import type { Movement } from '../design/tokens';

/** The slugs the site routes on: /site/classes/:slug. */
export type ClassSlug = 'hot-yoga' | 'barre' | 'pilates' | 'meditacion' | 'respiracion';

/** Things to bring, as keys the website resolves through `site.classes.bring.*`. */
export type BringKey = 'towel' | 'water' | 'socks' | 'comfy' | 'layers' | 'nothing';

export interface BrandClass {
  /** Display name. */
  name: Bi;
  /** Three-to-four-word descriptor above the name. */
  eyebrow: Bi;
  /** One-line summary for cards and teasers. */
  summary: Bi;
  /** The full essay, in order. */
  paragraphs: Bi[];
  /** Movement token this practice belongs to (D-01 `movements`). */
  movement: Movement;
  /**
   * `modalities.slug` values this essay covers, so a later worker can join the essay to the
   * catalogue rows (duration, intensity, heated) without editing the seed.
   * Empty = no modality exists for it yet (Respiración is taught inside other classes today).
   */
  modalitySlugs: string[];
  /** True when the room is heated — drives the "what to bring" list. */
  heated: boolean;
  bring: BringKey[];
  /** Art direction for the class's 16:9 media slot. */
  brief: string;
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
  /** The four words the brand speaks in. */
  values: [
    { es: 'Humana', en: 'Human' },
    { es: 'Cercana', en: 'Close' },
    { es: 'Directa', en: 'Direct' },
    { es: 'Presente', en: 'Present' },
  ] satisfies Bi[],
} as const;

/** Page 3 (dark panel) — "Nuestra filosofía". */
export const philosophy = {
  eyebrow: { es: 'Cómo pensamos', en: 'How we think' } satisfies Bi,
  title: { es: 'Nuestra filosofía', en: 'Our philosophy' } satisfies Bi,
  paragraphs: [
    {
      es: 'Entre lo que fue y lo que todavía no llega, existe este momento. Ese es el punto de partida de todo lo que hacemos en HOY: un espacio para detenerte, respirar, moverte, sentir y volver a ti mismo, no como un lujo aparte de tu vida, sino como algo que se vive en lo cotidiano.',
      en: 'Between what was and what has not yet arrived, there is this moment. That is the starting point of everything we do at HOY: a space to stop, breathe, move, feel and come back to yourself — not as a luxury set apart from your life, but as something you live in the ordinary day.',
    },
    {
      es: 'No buscamos que escapes de la rutina, sino que aprendas a habitarla de otra manera. HOY es movimiento, pero también pausa. Es energía y equilibrio. Es cuerpo, mente y conexión. No siempre hay que ir más rápido, hacer más o llegar más lejos: a veces, simplemente hay que volver.',
      en: 'We are not asking you to escape your routine, but to learn to inhabit it differently. HOY is movement, and it is also pause. It is energy and balance. It is body, mind and connection. You do not always have to go faster, do more or get further: sometimes you simply have to come back.',
    },
    {
      es: 'Nuestro propósito es hacer del movimiento y la respiración un camino para volver a nosotros mismos y habitar el presente. Por eso creamos un espacio donde el bienestar se integra de forma natural a tu vida: cada experiencia en HOY es una oportunidad para conectar con tu cuerpo, respirar con intención, compartir en comunidad y volver a ti mismo.',
      en: 'Our purpose is to make movement and breath a way back to ourselves and into the present. So we built a place where wellbeing folds naturally into your life: every experience at HOY is a chance to connect with your body, breathe with intention, share in community and return to yourself.',
    },
    {
      es: 'Esto se nota en cada detalle de HOY. En cómo recibimos a cada persona tal como llega, sin pedirle una versión perfecta de sí misma. En cómo hablamos, con la calma de quien no tiene prisa por impresionar. Y en cómo cuidamos cada gesto pequeño, porque el bienestar no se anuncia: se siente.',
      en: 'You can feel it in every detail of HOY. In how we welcome each person exactly as they arrive, without asking for a perfect version of themselves. In how we speak, with the calm of people in no hurry to impress. And in how we look after every small gesture, because wellbeing is not announced: it is felt.',
    },
  ] satisfies Bi[],
  /** The pull-quote the home page prints on the dark panel. */
  pullQuote: {
    es: 'No siempre hay que ir más rápido, hacer más o llegar más lejos: a veces, simplemente hay que volver.',
    en: 'You do not always have to go faster, do more or get further: sometimes you simply have to come back.',
  } satisfies Bi,
} as const;

/** Page 3 (lower half) — "Nuestras clases" intro. */
export const classesIntro = {
  eyebrow: { es: 'Cómo te mueves en HOY', en: 'How you move at HOY' } satisfies Bi,
  title: { es: 'Nuestras clases', en: 'Our classes' } satisfies Bi,
  paragraphs: [
    {
      es: 'En HOY encuentras varias formas de moverte y de estar bajo un mismo techo: hot yoga, barre, pilates, meditación y respiración. No son disciplinas aisladas ni categorías con niveles y etiquetas: son distintos caminos hacia el mismo lugar, tu cuerpo, tu respiración, tu presente. Cada una tiene su propio ritmo, pero todas comparten la misma intención, ayudarte a salir del piloto automático y volver a sentirte en tu cuerpo.',
      en: 'At HOY you will find several ways to move and to be, under one roof: hot yoga, barre, pilates, meditation and breathwork. They are not isolated disciplines, or categories with levels and labels: they are different paths to the same place — your body, your breath, your present. Each one has its own rhythm, and all of them share the same intention: to help you step out of autopilot and feel yourself in your body again.',
    },
    {
      es: 'No necesitas elegir "la correcta" desde el primer día. Puedes probar todas, quedarte con la que más te acomode, o alternar según cómo te sientas cada semana. Lo único que te pedimos es que llegues con ganas de estar presente, el resto lo construimos juntos, clase a clase.',
      en: 'You do not have to pick “the right one” on day one. You can try them all, settle into the one that fits you best, or alternate depending on how you feel that week. The only thing we ask is that you arrive wanting to be present; the rest we build together, class by class.',
    },
  ] satisfies Bi[],
} as const;

/** Pages 4–5 — one essay per class, keyed by route slug. */
export const classes: Record<ClassSlug, BrandClass> = {
  'hot-yoga': {
    name: { es: 'Hot Yoga', en: 'Hot Yoga' },
    eyebrow: { es: 'Calor y entrega', en: 'Heat and surrender' },
    summary: {
      es: 'Sala caliente a propósito: el cuerpo se abre y la respiración se vuelve el centro de todo.',
      en: 'A room heated on purpose: the body opens and the breath becomes the centre of everything.',
    },
    paragraphs: [
      {
        es: 'Hay algo que pasa cuando el cuerpo se mueve en calor: la mente deja de resistirse y empieza a ceder. En HOY, el hot yoga se practica en una sala donde la temperatura sube a propósito, no para castigarte, sino para ayudarte a llegar más rápido a ese lugar donde el cuerpo se abre, los músculos responden distinto y la respiración se vuelve el centro de todo. No es una clase para "sudar más": es una clase para sentir más.',
        en: 'Something happens when the body moves in heat: the mind stops resisting and starts to give. At HOY, hot yoga is practised in a room where the temperature rises on purpose — not to punish you, but to get you sooner to the place where the body opens, the muscles answer differently and the breath becomes the centre of everything. This is not a class about sweating more: it is a class about feeling more.',
      },
      {
        es: 'El calor cambia la forma en que te mueves. Las posturas que en frío se sienten rígidas, en calor se sienten posibles. El cuerpo se vuelve más flexible, la circulación se activa, y con cada respiración profunda vas soltando lo que traías cargado desde antes de entrar: la tensión del día, el ruido de la cabeza, la prisa de la ciudad. Sales distinto a como entraste. No porque hayas hecho más, sino porque te permitiste sentir todo lo que el cuerpo tenía guardado.',
        en: 'Heat changes the way you move. Postures that feel rigid when you are cold feel possible when you are warm. The body becomes more pliable, circulation switches on, and with every deep breath you let go of what you were carrying before you walked in: the tension of the day, the noise in your head, the hurry of the city. You leave different from how you came in — not because you did more, but because you let yourself feel everything the body had been keeping.',
      },
      {
        es: 'No necesitas experiencia previa para tu primera clase de hot yoga en HOY. El calor puede sonar intimidante al principio, pero nuestros maestros te enseñan a moverte con él, no contra él: cuándo bajar la intensidad, cuándo hidratarte, cuándo simplemente quedarte quieto un momento en la postura del niño. Cada cuerpo encuentra su propio ritmo dentro de la misma sala, y eso también es parte de la práctica: aprender a escucharte en vez de compararte.',
        en: 'You need no previous experience for your first hot yoga class at HOY. The heat can sound intimidating at first, but our teachers show you how to move with it instead of against it: when to ease off, when to drink, when to simply stay still for a moment in child’s pose. Every body finds its own rhythm inside the same room, and that is part of the practice too — learning to listen to yourself instead of comparing yourself.',
      },
      {
        es: 'Con el tiempo, el hot yoga se vuelve menos sobre lo que logras en la esterilla y más sobre lo que te llevas fuera de ella: más claridad, más fuerza, más capacidad de estar presente incluso cuando las cosas se ponen intensas. Practicar en calor te enseña a mantener la calma cuando todo pide que te alteres, una habilidad que se queda contigo mucho después de salir del estudio. Esa es, quizás, la razón real por la que la gente vuelve.',
        en: 'Over time, hot yoga becomes less about what you achieve on the mat and more about what you take away from it: more clarity, more strength, more capacity to stay present even when things get intense. Practising in heat teaches you to keep calm when everything is asking you to come undone — a skill that stays with you long after you leave the studio. That is perhaps the real reason people come back.',
      },
    ],
    movement: 'arde',
    modalitySlugs: ['hot-vinyasa'],
    heated: true,
    bring: ['towel', 'water', 'comfy'],
    brief: 'hot room mid-class, low warm key light, steam on the glass, one figure in downward dog',
  },
  barre: {
    name: { es: 'Barre', en: 'Barre' },
    eyebrow: { es: 'Precisión y pulso', en: 'Precision and pulse' },
    summary: {
      es: 'Alta intensidad, bajo impacto: micro-movimientos sostenidos al ritmo de la música.',
      en: 'High intensity, low impact: micro-movements held to the pulse of the music.',
    },
    paragraphs: [
      {
        es: 'Barre en HOY combina lo mejor de tres mundos: la precisión del pilates, la elegancia del ballet y la energía del entrenamiento funcional. El resultado es una clase de alta intensidad pero bajo impacto, donde trabajas todos los grupos musculares principales sin un solo salto brusco ni golpe en las articulaciones. Es exigente, pero se siente amable con tu cuerpo.',
        en: 'Barre at HOY brings together the best of three worlds: the precision of pilates, the elegance of ballet and the energy of functional training. The result is a high-intensity, low-impact class where you work every major muscle group without a single jarring jump or impact on the joints. It is demanding, and it feels kind to your body.',
      },
      {
        es: 'Lo que hace diferente a barre no es el tamaño del movimiento, sino su precisión. Trabajamos con micro-movimientos, repeticiones pequeñas y controladas, sostenidas justo el tiempo suficiente para que el músculo tiemble antes de soltar. La música marca el ritmo de cada serie, y ese pulso constante es lo que te ayuda a llegar a esas últimas diez repeticiones que, al principio, parecían imposibles.',
        en: 'What makes barre different is not the size of the movement but its precision. We work with micro-movements: small, controlled repetitions held just long enough for the muscle to shake before it lets go. The music sets the pace of each set, and that steady pulse is what carries you through the last ten repetitions that looked impossible when you started.',
      },
      {
        es: 'Nuestros maestros de barre se preparan específicamente para esta disciplina, porque creemos que la calidad de una clase se nota en los detalles: en la corrección justo a tiempo, en el ajuste de postura antes de que te lesiones, en saber cuándo empujarte un poco más y cuándo dejarte descansar. No es una clase genérica de tonificación con música de fondo: es una experiencia diseñada con intención, clase a clase.',
        en: 'Our barre teachers train specifically for this discipline, because we believe the quality of a class shows in the details: the correction that lands just in time, the adjustment made before you hurt yourself, knowing when to push you a little further and when to let you rest. This is not a generic toning class with music in the background: it is an experience designed with intention, class after class.',
      },
      {
        es: 'No te preocupes si es tu primera vez: la clase se adapta a cualquier nivel, desde quien nunca ha tomado una clase de este estilo hasta quien ya conoce cada postura de memoria. Al final, lo que se queda contigo no es solo un cuerpo más fuerte, sino la certeza de que pudiste llegar más lejos de lo que pensabas.',
        en: 'Do not worry if it is your first time: the class adapts to any level, from someone who has never taken this kind of class to someone who knows every position by heart. What stays with you in the end is not only a stronger body, but the certainty that you could go further than you thought.',
      },
    ],
    movement: 'enraiza',
    modalitySlugs: ['barre'],
    heated: false,
    bring: ['socks', 'water', 'comfy'],
    brief: 'hands on the barre, shallow depth of field, calf and heel lifted, cream wall behind',
  },
  pilates: {
    name: { es: 'Pilates', en: 'Pilates' },
    eyebrow: { es: 'Centro y control', en: 'Core and control' },
    summary: {
      es: 'Empieza en el centro: control, conciencia y precisión en cada gesto.',
      en: 'It starts at the centre: control, awareness and precision in every gesture.',
    },
    paragraphs: [
      {
        es: 'Pilates empieza en un solo lugar: el centro. Ahí se activa la fuerza que después sostiene cada movimiento, cada postura, cada gesto del cuerpo entero. En HOY, esta disciplina te enseña a moverte con más control, más conciencia y más precisión, no a base de repeticiones interminables, sino de intención en cada gesto.',
        en: 'Pilates starts in one place: the centre. That is where the strength that later holds every movement, every posture, every gesture of the whole body switches on. At HOY, this discipline teaches you to move with more control, more awareness and more precision — not through endless repetitions, but through intention in every gesture.',
      },
      {
        es: 'A diferencia de otras formas de movimiento, es un trabajo lento en apariencia, pero profundo en resultado: fortaleces el core, mejoras tu postura y aprendes a alinear un cuerpo que, en el día a día, se acostumbra a encorvarse frente a una pantalla o a cargar peso sin darse cuenta. Cada ejercicio se siente simple al principio, pero exige más de lo que parece.',
        en: 'Unlike other forms of movement, the work looks slow and lands deep: you strengthen the core, improve your posture and learn to realign a body that, day to day, gets used to curving over a screen or carrying weight without noticing. Every exercise feels simple at first, and asks more of you than it looks.',
      },
      {
        es: 'Nuestros maestros de pilates trabajan contigo desde el detalle: la posición de tu columna, la respiración que acompaña cada movimiento, el pequeño ajuste que hace que un ejercicio pase de ser mecánico a ser efectivo. No importa si nunca has practicado o si llevas años haciéndolo, la clase se adapta a tu cuerpo y a tu ritmo, sin comparaciones ni presión por llegar a un nivel específico.',
        en: 'Our pilates teachers work with you from the detail: the position of your spine, the breath that accompanies each movement, the small adjustment that turns an exercise from mechanical into effective. It makes no difference whether you have never practised or have practised for years — the class adapts to your body and your pace, with no comparisons and no pressure to reach a particular level.',
      },
      {
        es: 'Lo que empieza como fuerza en el centro del cuerpo termina notándose en todo lo demás: en cómo caminas, en cómo te sientas, en cómo respondes cuando algo te toma por sorpresa. Pilates no promete cambios rápidos ni dramáticos, promete algo más duradero, una relación distinta con tu propio cuerpo, hecha de precisión, paciencia y presencia.',
        en: 'What begins as strength in the centre of the body ends up showing everywhere else: in how you walk, how you sit, how you respond when something takes you by surprise. Pilates does not promise fast or dramatic change; it promises something that lasts longer — a different relationship with your own body, made of precision, patience and presence.',
      },
    ],
    movement: 'enraiza',
    modalitySlugs: ['pilates'],
    heated: false,
    bring: ['socks', 'water', 'comfy'],
    brief: 'mat work from above, spine long, teacher’s hand cueing the ribcage, morning light',
  },
  meditacion: {
    name: { es: 'Meditación', en: 'Meditation' },
    eyebrow: { es: 'Quietud y permiso', en: 'Stillness and permission' },
    summary: {
      es: 'Detenerse unos minutos sin tener que producir, responder ni resolver nada.',
      en: 'Stopping for a few minutes with nothing to produce, answer or resolve.',
    },
    paragraphs: [
      {
        es: 'En medio del ruido constante, meditar es un acto casi radical: detenerte, aunque sea por unos minutos, sin la necesidad de producir, responder o resolver nada. En HOY entendemos la meditación como eso, un espacio de quietud donde la mente encuentra permiso para simplemente estar, sin exigirle silencio absoluto ni una versión perfecta de calma.',
        en: 'In the middle of constant noise, meditating is an almost radical act: stopping, even for a few minutes, with no need to produce, answer or resolve anything. At HOY we understand meditation exactly that way — a space of stillness where the mind is given permission simply to be, without demanding absolute silence or a perfect version of calm.',
      },
      {
        es: 'La incluimos entre nuestras experiencias porque creemos que el bienestar no vive solo en el movimiento del cuerpo, también vive en la pausa. Practicar con regularidad ayuda a reducir el estrés acumulado, mejora la claridad mental y entrena una capacidad que se vuelve cada vez más escasa: la de estar presente. Por eso, además de sesiones guiadas dentro de nuestro horario regular, la meditación es una extensión natural de lo que HOY ya propone, volver a ti mismo, un momento a la vez.',
        en: 'We include it among our experiences because we believe wellbeing does not live only in the movement of the body; it also lives in the pause. Practising regularly helps release accumulated stress, sharpens mental clarity and trains a capacity that grows scarcer all the time: being present. So alongside guided sessions in our regular schedule, meditation is a natural extension of what HOY already proposes — coming back to yourself, one moment at a time.',
      },
    ],
    movement: 'libera',
    modalitySlugs: ['meditacion', 'yin'],
    heated: false,
    bring: ['layers', 'nothing'],
    brief: 'seated circle at dusk, one lamp, eyes closed, no faces identifiable',
  },
  respiracion: {
    name: { es: 'Respiración', en: 'Breathwork' },
    eyebrow: { es: 'Respirar a propósito', en: 'Breathing on purpose' },
    summary: {
      es: 'Algo que ya sabes hacer, hecho con atención: más calma y más energía de la que imaginas.',
      en: 'Something you already know how to do, done with attention: more calm and more energy than you would expect.',
    },
    paragraphs: [
      {
        es: 'Hay algo curioso en la respiración: la hacemos sin parar y casi nunca la notamos. En HOY te invitamos a hacer justo eso, notarla, y descubrir que ahí, en algo tan simple, hay más calma y más energía de la que imaginas.',
        en: 'There is something curious about breathing: we do it without stopping and we almost never notice it. At HOY we invite you to do exactly that — notice it, and discover that in something so simple there is more calm and more energy than you imagine.',
      },
      {
        es: 'No se trata de dominar una técnica compleja, sino de reconectar con algo que ya sabes hacer. Por eso también está presente en nuestras clases guiadas: una pausa breve, sin esfuerzo, que te acompaña mucho después de salir del estudio.',
        en: 'It is not about mastering a complex technique, but about reconnecting with something you already know how to do. That is why it is present in our guided classes too: a short, effortless pause that stays with you long after you leave the studio.',
      },
    ],
    movement: 'libera',
    // 0018: the `respiracion` modality row exists in the seed; M-08f (breathworkOwnClass) decides whether the public sees it.
    modalitySlugs: ['respiracion'],
    heated: false,
    bring: ['comfy', 'nothing'],
    brief: 'close crop of a chest and shoulders mid-inhale, soft backlight, cream tones',
  },
};

/** Route order for the classes page and the home strip. */
export const classOrder: ClassSlug[] = ['hot-yoga', 'barre', 'pilates', 'meditacion', 'respiracion'];

export const taglines = {
  life: { es: 'La vida es HOY.', en: 'Life is HOY.' } satisfies Bi,
  start: { es: 'Todo empieza HOY.', en: 'Everything starts HOY.' } satisfies Bi,
} as const;

/** One import for pages that want the whole board. */

export const brandClass = (slug: string): BrandClass | undefined =>
  (classOrder as string[]).includes(slug) ? classes[slug as ClassSlug] : undefined;
