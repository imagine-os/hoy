import type { StringTable } from '../../../i18n/types';

/** H-7 · AD-06 team users (production build). */
export const teamStrings: StringTable = {
  'team.title': { es: 'Equipo', en: 'Team' },
  'team.body': { es: 'Invita a recepción o administración. El cambio de rol o la baja aplica en la siguiente acción de esa persona.', en: 'Invite front desk or administration. A role change or removal applies on that person’s next action.' },
  'team.email': { es: 'Correo', en: 'Email' },
  'team.role': { es: 'Rol', en: 'Role' },
  'team.role.front_desk': { es: 'Recepción', en: 'Front desk' },
  'team.role.administrator': { es: 'Administración', en: 'Administration' },
  'team.role.other': { es: 'Otro rol', en: 'Other role' },
  'team.invite': { es: 'Invitar', en: 'Invite' },
  'team.invited': { es: 'Invitación enviada a {email}.', en: 'Invitation sent to {email}.' },
  'team.changed': { es: 'Rol cambiado.', en: 'Role changed.' },
  'team.removed': { es: 'Acceso retirado.', en: 'Access removed.' },
  'team.remove': { es: 'Quitar acceso', en: 'Remove access' },
  'team.empty': { es: 'Todavía no hay nadie en el equipo.', en: 'Nobody on the team yet.' },
  'team.guard.last_admin': { es: 'Debe quedar al menos una persona de administración.', en: 'At least one administration user must remain.' },
  'team.mail.subject': { es: 'Invitación al equipo de {studio}', en: 'Invitation to the {studio} team' },
  'team.mail.body': { es: 'Hola,\n\nTe invitaron al equipo de {studio} como {role}. Entra con este enlace:\n{url}\n\nSi no esperabas este correo, ignóralo.', en: 'Hi,\n\nYou were invited to the {studio} team as {role}. Sign in with this link:\n{url}\n\nIf you did not expect this email, ignore it.' },
  'team.guard.self': { es: 'No puedes cambiar ni quitar tu propio acceso.', en: 'You cannot change or remove your own access.' },
};
