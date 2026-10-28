import type { StringTable } from '../../../i18n/types';

/** H-7 · AD-05 reception hours and the Sunday rule (production build). */
export const receptionHoursStrings: StringTable = {
  'recHours.title': { es: 'Horario de recepción', en: 'Front desk hours' },
  'recHours.body': { es: 'Cuándo recepción revisa pagos. Una reserva con transferencia hecha fuera de este horario empieza a contar desde la siguiente apertura.', en: 'When the front desk reviews payments. A transfer booking made outside these hours starts counting from the next opening.' },
  'recHours.open': { es: 'Abierto', en: 'Open' },
  'recHours.from': { es: 'Abre', en: 'Opens' },
  'recHours.to': { es: 'Cierra', en: 'Closes' },
  'recHours.closedDates': { es: 'Días cerrados (festivos, cierres)', en: 'Closed days (holidays, closures)' },
  'recHours.addDate': { es: 'Agregar día', en: 'Add day' },
  'recHours.save': { es: 'Guardar horario', en: 'Save hours' },
  'recHours.saved': { es: 'Horario guardado. Aplica desde la próxima reserva.', en: 'Hours saved. They apply from the next booking.' },
  'recHours.problem.time': { es: '{day}: la hora es HH:MM.', en: '{day}: the time is HH:MM.' },
  'recHours.problem.order': { es: '{day}: cierra antes de abrir.', en: '{day}: closes before it opens.' },
  'recHours.sunday': { es: 'Recepción cerrada el domingo y hay {n} clases el domingo: las transferencias del domingo se revisan el lunes al abrir. Si la persona sube el comprobante antes de la clase conserva su cupo; sin comprobante, el cupo se libera al empezar la clase.', en: 'The front desk is closed on Sunday and there are {n} Sunday classes: Sunday transfers are reviewed on Monday at opening. A receipt uploaded before the class keeps the spot; with no receipt the spot is released when the class starts.' },
  'recHours.noDay': { es: 'Abre al menos un día: sin ningún día, el sistema lo leería como abierto siempre.', en: 'Open at least one day: with none, the system would read it as always open.' },
  'recHours.forbidden': { es: 'Solo la cuenta principal del estudio puede cambiar este horario por ahora.', en: 'Only the studio’s main account can change these hours for now.' },
};
