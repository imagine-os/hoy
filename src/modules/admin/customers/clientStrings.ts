import type { StringTable } from '../../../i18n/types';

/** Copy for the production client detail page; kept separate from the legacy admin catalogue. */
export const clientStrings: StringTable = {
  'admin.client.title': {es:'Datos del cliente',en:'Client details'},
  'admin.client.name': {es:'Nombre completo',en:'Full name'},
  'admin.client.phone': {es:'Teléfono',en:'Phone'},
  'admin.client.dob': {es:'Fecha de nacimiento',en:'Date of birth'},
  'admin.client.emergency_contact_name': {es:'Nombre del contacto de emergencia',en:'Emergency contact name'},
  'admin.client.emergency_contact_phone': {es:'Teléfono de emergencia',en:'Emergency contact phone'},
  'admin.client.email': {es:'Correo electrónico',en:'Email'},
  'admin.client.boundary': {es:'Estos cambios actualizan los datos personales. No cambian el acceso, las reservas, los paquetes ni los pagos.',en:'These changes update personal details. They do not change login access, bookings, packages or payments.'},
  'admin.client.save': {es:'Guardar datos',en:'Save details'},
  'admin.client.saved': {es:'Datos guardados y verificados.',en:'Details saved and verified.'},
  'admin.client.invalid': {es:'Revisa este valor antes de guardar.',en:'Check this value before saving.'},
  'admin.client.stale': {es:'Alguien cambió estos datos. Vuelve a cargarlos antes de editar.',en:'Someone changed these details. Reload before editing.'},
  'admin.client.missing': {es:'No se encontró un cliente accesible con este identificador.',en:'No accessible client was found with this identifier.'},
  'admin.client.unconfirmed': {es:'No se pudo verificar el resultado. Reintenta con los mismos datos o vuelve a cargarlos antes de editar.',en:'The result could not be verified. Retry with the same details or reload before editing.'},
  'admin.client.readOnly': {es:'Tu rol permite ver estos datos, pero no editarlos.',en:'Your role can view these details but cannot edit them.'},
};
