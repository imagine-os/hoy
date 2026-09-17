// Generates src/specs/canvasSpecs.ts from reference/canvas/specs.json.
// Run: node scripts/gen-specs.mjs   (commit the output; the TS file is what the app imports)
import { readFileSync, writeFileSync } from 'node:fs';

const src = JSON.parse(readFileSync(new URL('../reference/canvas/specs.json', import.meta.url), 'utf8'));

const ES_NAME = {
  'A-01': 'Splash / carga que respira', 'A-02': 'Iniciar sesión', 'A-03': 'Crear cuenta',
  'A-05': 'Intención del día — ¿Cómo quieres sentirte hoy?', 'A-06': 'Términos y condiciones / Política de privacidad',
  'C-01': 'Inicio', 'C-02': 'Horario de clases', 'C-03': 'Detalle de clase', 'C-04': 'Reservar y pagar',
  'C-05': 'Métodos de pago', 'C-06': 'Planes de membresía', 'C-07': 'Pases Bienvenida', 'C-07b': 'Créditos y paquetes',
  'C-08': 'Clase reservada, cuenta regresiva, cancelar y reprogramar', 'C-08b': 'Hoja de cancelar o reprogramar',
  'C-10': 'Califica tu clase', 'C-11': 'Historial y pagos', 'C-13': 'Reglas del club y buenas prácticas',
  'C-14 / C-15': 'Preguntas frecuentes', 'C-16': 'Invita a un amigo', 'C-17': 'Tarjeta de regalo',
  'C-18': 'Galería y perfil de profesores', 'C-19': 'Perfil, ajustes y membresía', 'C-20': 'Lista de espera y ventana de reclamo',
  'C-21': 'Recuperar contraseña (OTP por WhatsApp)', 'C-22': 'Gestionar membresía', 'C-23': 'Detalle de evento y RSVP',
  'C-24': 'Bandeja de notificaciones', 'C-25': 'Más · perfil, reglas, contacto', 'P-01': 'Planes y precios — Modelo de Valor v3',
  'E-01': 'Inicio · primera vez (vacío)', 'E-02': 'Pago rechazado', 'E-03': 'Clase cancelada por el estudio', 'E-04': 'Acceso bloqueado',
  'S-01': 'Inicio por rol y selector demo', 'S-02': 'Check-in en recepción', 'S-03': 'App de profesores', 'S-04': 'Registrar y cobrar',
  'M-01': 'Panel admin e interruptores de funciones', 'M-02': 'Contenido: clases, profesores, horario, precios',
  'M-03': 'Tablas y relaciones', 'M-04': 'Diseños de email transaccional', 'M-05': 'Automatizaciones de WhatsApp',
  'M-06': 'CRM · miembro 360', 'M-07': 'Registro de actividad', 'M-08': 'Ajustes y políticas del estudio',
  'D-01': 'Materiales, tokens y fisicidad', 'D-02': 'Biblioteca de componentes — atómica', 'K-01': 'Plan, kanban y changelog',
};

const ES_PURPOSE = {
  'A-01': 'Marcar el registro emocional antes de cualquier UI: tres círculos respiran alrededor del logo mientras se restaura la sesión, se cargan los feature flags y se detecta el idioma.',
  'A-02': 'Que un alumno que vuelve entre en un toque: biometría en dispositivo conocido, luego Apple o Google, luego correo y contraseña.',
  'A-03': 'Crear la cuenta con lo mínimo necesario y recoger consentimientos, contacto de emergencia y verificación de WhatsApp.',
  'A-05': 'Preguntar cómo quiere sentirse hoy la persona y usar esa intención para ordenar las clases del día.',
  'A-06': 'Páginas legales reales, enlazables y versionadas; los consentimientos registran qué versión se aceptó.',
  'C-01': 'La superficie diaria: qué pasa hoy, qué tengo reservado, qué quiere contarme el estudio y los recordatorios que el estudio necesita.',
  'C-02': 'Ver y filtrar el horario semanal por modalidad, profesor y nivel, con capacidad en vivo.',
  'C-03': 'Todo sobre una clase: profesor, sala, nivel, preparación, cupos y el botón de reservar.',
  'C-04': 'Reservar y pagar en un solo flujo: usar crédito, membresía o pagar la clase; recibo al instante.',
  'C-05': 'Guardar y gestionar métodos de pago; efectivo solo desde recepción.',
  'C-06': 'Comparar y comprar planes de membresía; muestra el estado del plan actual.',
  'C-07': 'Los pases Bienvenida: prueba, individual, paquetes de 3 y 10; elegibilidad de la clase de prueba.',
  'C-07b': 'Saldo de créditos, vencimientos y el libro mayor de cada movimiento.',
  'C-08': 'La clase reservada con cuenta regresiva, política de cancelación y acciones de cancelar o reprogramar.',
  'C-08b': 'Hoja inferior para cancelar o mover una reserva respetando la política.',
  'C-10': 'Calificar la clase y al profesor en menos de 30 segundos; alimenta métricas y moderación.',
  'C-11': 'Historial de clases, pagos, facturas y créditos, con filtros y exportación.',
  'C-13': 'Reglas del club y buenas prácticas en artículos cortos con lectura confirmada.',
  'C-14 / C-15': 'Preguntas frecuentes buscables, versionadas y en dos idiomas.',
  'C-16': 'Invitar a un amigo con pase de invitado o referido y ver la atribución.',
  'C-17': 'Comprar y programar la entrega de una tarjeta de regalo.',
  'C-18': 'Galería de profesores con perfil, certificaciones, clases y valoraciones.',
  'C-19': 'Perfil, ajustes, idioma, notificaciones, dispositivos y membresía en un solo lugar.',
  'C-20': 'Lista de espera con ventana de reclamo cuando se libera un cupo.',
  'C-21': 'Recuperar acceso con un código por WhatsApp, con límites de intentos.',
  'C-22': 'Pausar, cambiar o cancelar la membresía y ver los ciclos de facturación.',
  'C-23': 'Detalle de un evento con RSVP, precio y pases de invitado.',
  'C-24': 'Bandeja de notificaciones con enlaces profundos y preferencias por canal.',
  'C-25': 'El menú Más: perfil, reglas, horarios, contacto y ajustes.',
  'P-01': 'La única fuente de precios: Bienvenida, Membresía, Pausas, Regalos y Espacio, leída por todas las superficies.',
  'E-01': 'Estado vacío del inicio para una persona nueva: invita a reservar la primera clase.',
  'E-02': 'Pago rechazado: explicar, reintentar, cambiar método o pedir ayuda a recepción.',
  'E-03': 'El estudio canceló la clase: devolver crédito, ofrecer alternativas y avisar.',
  'E-04': 'Acceso bloqueado tras intentos fallidos: espera, OTP o contacto con el estudio.',
  'S-01': 'Inicio por rol con selector de usuario demo para probar cada experiencia.',
  'S-02': 'Check-in en recepción: lista de la clase, llegadas, lista de espera y cobros rápidos.',
  'S-03': 'App de profesores: mis clases, asistencia, descripción y vista de nómina.',
  'S-04': 'La transacción de mostrador en una pantalla: quién es, qué compra, cómo paga.',
  'M-01': 'Panel de administración con métricas y los interruptores de funciones por página.',
  'M-02': 'Gestionar clases, profesores, horario y precios desde un solo lugar.',
  'M-03': 'Todas las tablas del sistema, limpias y ordenadas, con edición, filtros y exportación.',
  'M-04': 'Diseñar y versionar los emails transaccionales con disparadores y estadísticas.',
  'M-05': 'Automatizaciones de WhatsApp: plantillas aprobadas, disparadores, horas de silencio y registro.',
  'M-06': 'Ficha 360 del miembro: membresía, créditos, asistencia, pagos, conversaciones y notas.',
  'M-07': 'Registro de toda la actividad del sistema con filtros por entidad, rol y fecha.',
  'M-08': 'Perfil del estudio, sedes, salas, horarios, políticas, impuestos e integraciones.',
  'D-01': 'Los tokens de diseño: color, tipografía, espaciado, radios, sombras y movimiento.',
  'D-02': 'La biblioteca viva de componentes por nivel atómico, con estados y ejemplos.',
  'K-01': 'El plan, el kanban y el changelog del sistema.',
};

const CANVAS_ROLE = {
  'all roles': ['super_admin','admin','coordinator','front_desk','finance','teacher','maintenance','customer'],
  public: ['public'], super: ['super_admin'], coordinator: ['coordinator'], 'front desk': ['front_desk'],
  finance: ['finance'], teacher: ['teacher'], student: ['customer'], designer: ['super_admin'], developer: ['super_admin'],
  'studio owner': ['admin'], staff: ['coordinator', 'front_desk'], admin: ['admin'],
};
function roles(list = []) {
  const out = new Set();
  for (const label of list) {
    const l = label.toLowerCase();
    let hit = false;
    for (const [k, v] of Object.entries(CANVAS_ROLE)) if (l.includes(k)) { v.forEach((r) => out.add(r)); hit = true; break; }
    if (!hit) out.add('customer');
  }
  return [...out];
}
function layout(layers = '') {
  return layers.split('\n').slice(1)
    .filter((l) => /^[├└]/.test(l))
    .map((l) => l.replace(/^[├└]\s*/, '').trim())
    .filter(Boolean);
}
function integrations(spec) {
  const text = JSON.stringify(spec).toLowerCase();
  const out = [];
  if (/whatsapp|wa_|otp/.test(text)) out.push('WhatsApp');
  if (/payment|checkout|invoice|refund|payroll|gateway|declined/.test(text)) out.push('Wompi');
  if (/email|receipt|send_log/.test(text)) out.push('Email');
  if (/session|auth|sign|password|biometric|lockout/.test(text)) out.push('Supabase Auth');
  if (/realtime|capacity|waitlist|check-in|checkins|live/.test(text)) out.push('Supabase Realtime');
  if (/invoice|dian|tax/.test(text)) out.push('DIAN e-invoicing');
  if (/push|notification/.test(text)) out.push('Push notifications');
  return out;
}

const entries = Object.values(src).sort((a, b) => a.code.localeCompare(b.code));
let out = `// GENERATED by scripts/gen-specs.mjs from reference/canvas/specs.json — edit the script or the JSON, then regenerate.
// Every canvas code as a PageSpec. Pages reference these: spec: canvasSpecs['C-01'].
import type { PageSpec } from './types';

export const canvasSpecs: Record<string, PageSpec> = {\n`;
for (const s of entries) {
  const spec = {
    code: s.code,
    name: { es: ES_NAME[s.code] ?? s.name, en: s.name },
    purpose: { es: ES_PURPOSE[s.code] ?? s.intent, en: s.intent },
    layout: layout(s.layers),
    data: s.data ?? [],
    roles: roles(s.roles),
    logic: s.rules ?? [],
    integrations: integrations(s),
    states: s.states,
    toggles: s.toggles,
    story: s.story,
    api: s.api,
    layerTree: s.layers,
    canvasRef: `reference/canvas/Hoy Wellness System.dc.html#${s.code.replace(/ \/ .*/, '')}`,
  };
  for (const k of Object.keys(spec)) if (spec[k] === undefined) delete spec[k];
  out += `  ${JSON.stringify(s.code)}: ${JSON.stringify(spec, null, 2).replace(/\n/g, '\n  ')},\n`;
}
out += `};\n\nexport const canvasCodes = Object.keys(canvasSpecs);\n`;
writeFileSync(new URL('../src/specs/canvasSpecs.ts', import.meta.url), out);
console.log(`wrote ${entries.length} specs`);
