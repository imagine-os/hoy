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
  'team.added': { es: '{email} ya tenía una cuenta en el estudio: ahora también es {role}. No se envía invitación; entra con su cuenta de siempre.', en: '{email} already had an account at the studio: they are now also {role}. No invitation is sent; they sign in with their usual account.' },
  'team.signedUp': { es: '{email} ya había entrado antes: el rol {role} quedó asignado y puede entrar ya. No se envió correo.', en: '{email} had already signed in before: the {role} role is in place and they can sign in now. No email was sent.' },
  'team.already': { es: 'Esa persona ya está en el equipo. Cambia su rol en la lista.', en: 'That person is already on the team. Change their role in the list.' },
  'team.repair': { es: 'Completar acceso', en: 'Complete access' },
  'team.repaired': { es: 'Acceso completado.', en: 'Access completed.' },
  'team.changed': { es: 'Rol cambiado.', en: 'Role changed.' },
  'team.removed': { es: 'Acceso retirado.', en: 'Access removed.' },
  'team.remove': { es: 'Quitar acceso', en: 'Remove access' },
  'team.empty': { es: 'Todavía no hay nadie en el equipo.', en: 'Nobody on the team yet.' },
  'team.guard.last_admin': { es: 'Debe quedar al menos una persona de administración.', en: 'At least one administration user must remain.' },
  'team.mail.subject': { es: 'Invitación al equipo de {studio}', en: 'Invitation to the {studio} team' },
  'team.mail.body': { es: 'Hola,\n\nTe invitaron al equipo de {studio} como {role}. Entra con este enlace:\n{url}\n\nSi no esperabas este correo, ignóralo.', en: 'Hi,\n\nYou were invited to the {studio} team as {role}. Sign in with this link:\n{url}\n\nIf you did not expect this email, ignore it.' },
  'team.guard.self': { es: 'No puedes cambiar ni quitar tu propio acceso.', en: 'You cannot change or remove your own access.' },
};
