// Each public page's title and description, and the seven classes they name: the ONE table the server writes into the page
// it serves (server/seo.mjs) and the browser keeps after it loads (src/modules/website/pageMeta.ts, RouteTitle). Pure data,
// no imports, so the server bundle and the frontend build both take it as it is. Copy drafted from the site's own
// (reading R5; Jas may replace the wording). scripts/test-seo.mjs checks the class list against src/tenant/brand.ts and
// scripts/test-hoy-12nov-r2.mjs that every browser title is the server's.

/** The seven classes, in the owner's order (src/tenant/brand.ts `classOrder`, `classes[slug]`). */
export const CLASSES = [
  { slug: 'ligereza', name: 'Ligereza', tagline: 'Suelto lo que no me sirve', concept: 'Liberación. Apertura. Fluidez. Movimiento consciente.', method: 'Movilidad + Stretching + Yoga yin' },
  { slug: 'hibrido', name: 'Híbrido', tagline: 'Soy fuerte y flexible', concept: 'Fusión. Completitud. Balance. Lo mejor de ambos mundos.', method: 'Pilates + Yoga dinámico' },
  { slug: 'fuego', name: 'Fuego', tagline: 'Enciende tu energía', concept: 'Encendimiento. Despertar. Energía vital desatada.', method: 'Pilates dinámico + Rumba' },
  { slug: 'solido', name: 'Sólido', tagline: 'Tu base se construye desde adentro', concept: 'Enraizamiento. Construcción. Solidez desde adentro.', method: 'Pilates + pesas y resistencia' },
  { slug: 'centro', name: 'Centro', tagline: 'Estoy aquí, ahora', concept: 'Presencia. Anclaje. Silencio profundo. Vuelta a ti.', method: 'Meditación + Respiración consciente + Sound healing' },
  { slug: 'alineacion', name: 'Alineación', tagline: 'Entiendo cómo funciono', concept: 'Inteligencia. Funcionalidad. Biomecánica clara. Movimiento inteligente.', method: 'Yoga dinámico funcional + Vinyasas' },
  { slug: 'pulso', name: 'Pulso', tagline: 'Siento cada fibra de mi ser', concept: 'Sensibilidad. Micro-movimientos. Inteligencia muscular profunda.', method: 'Barre + isometrías + pulsos' },
];

export const BRAND = 'HOY Human Club';

/** Each public path's title and description (R5: from the site's current copy). */
export const PAGES = {
  '/': { title: 'HOY Human Club — Pilates, yoga y movimiento en El Poblado, Medellín', description: 'Muévete. Respira. Vive el presente. Siete clases que combinan Pilates, Yoga, Barre, movilidad, fuerza, cardio y respiración en El Poblado, Medellín.' },
  '/nosotros': { title: `Nosotros · ${BRAND}`, description: 'HOY nace para disfrutar el presente a través del movimiento: un lugar para entrenar, moverte, conectar con otros y hacer una pausa en tu rutina.' },
  '/clases': { title: `Nuestras clases · ${BRAND}`, description: 'Siete clases, siete caminos: Ligereza, Híbrido, Fuego, Sólido, Centro, Alineación y Pulso. Elige la que va con tu energía y tu momento.' },
  '/metodologias': { title: `Metodologías · ${BRAND}`, description: 'Pilates, Yoga, Barre, movilidad, fuerza, cardio, meditación y respiración: las metodologías que combinamos en cada clase de HOY.' },
  '/horario': { title: `Horario de clases · ${BRAND}`, description: 'Consulta el horario de clases de lunes a domingo y reserva tu lugar en HOY Human Club, en El Poblado, Medellín.' },
  '/profesores': { title: `Profesores · ${BRAND}`, description: 'Conoce a los profesores de HOY: personas que enseñan desde la práctica, no desde el guion, en El Poblado, Medellín.' },
  '/planes': { title: `Planes y precios · ${BRAND}`, description: 'Clase de prueba, clases sueltas, paquetes, clases privadas y tarjetas de regalo. Precios en pesos colombianos.' },
  '/preguntas': { title: `Preguntas frecuentes · ${BRAND}`, description: 'Todo lo que quieres saber antes de tu primera clase en HOY: qué llevar, cómo reservar y cómo pagar. Si tu pregunta no está, escríbenos.' },
  '/contacto': { title: `Contacto · ${BRAND}`, description: 'Escríbenos por WhatsApp o ven a conocer la sala: Cl. 7B Sur # 29C-100, El Poblado, Medellín.' },
  '/legal/terminos': { title: `Términos y condiciones · ${BRAND}`, description: 'Los términos y condiciones de HOY Human Club: reservas, pagos, cancelaciones y uso del estudio y de la app.' },
  '/legal/privacidad': { title: `Política de privacidad · ${BRAND}`, description: 'Cómo HOY Human Club trata tus datos personales, para qué los usamos y cómo ejercer tus derechos sobre ellos.' },
  '/eliminar-cuenta': { title: `Eliminar tu cuenta · ${BRAND}`, description: 'Pide que eliminemos tu cuenta de HOY Human Club sin iniciar sesión. Te explicamos qué se conserva por ley y qué se elimina.' },
};
for (const c of CLASSES) {
  PAGES[`/clases/${c.slug}`] = { title: `${c.name}: ${c.tagline} · ${BRAND}`, description: `${c.name}, una clase de HOY en Medellín. ${c.concept} Método: ${c.method}.` };
}

