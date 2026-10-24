import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { tenant } from '../../../tenant/tenant';
import {PaymentInstructions} from '../PaymentInstructions/PaymentInstructions';
import {projectPaymentInstructions} from '../../../modules/admin/paymentInstructions';
import { EmailPreview } from './EmailPreview';

export default defineMeta({
  tier: 'organism', name: 'EmailPreview',
  description: { es: 'El email transaccional renderizado como lo ve la persona: marca, asunto, cuerpo, botón y pie, con variables resueltas o resaltadas.', en: 'The transactional email rendered as the customer sees it: brand, subject, body, CTA and footer, with variables resolved or highlighted.' },
  props: [
    { name: 'subject / body', type: 'string', required: true, description: { es: 'Texto con {{variables}}; líneas en blanco separan párrafos.', en: 'Text with {{variables}}; blank lines split paragraphs.' } },
    { name: 'previewContent', type: 'ReactNode', description: {es:'Contenido opcional de vista previa; no activa envíos.',en:'Optional preview content; never triggers sending.'} },
    { name: 'cta', type: '{ label, href }', description: { es: 'Botón con enlace profundo.', en: 'Deep-link button.' } },
    { name: 'vars', type: 'Record<string,string>', description: { es: 'Datos de muestra.', en: 'Sample data.' } },
    { name: 'footer / envelope', type: 'string', description: { es: 'Pie legal y línea de sobre.', en: 'Legal footer and envelope line.' } },
  ],
  states: ['caller preview content', 'resolved', 'unresolved-vars', 'no-cta'],
  usages: [{title:{es:'Instrucciones ficticias no enviadas',en:'Unsent fictional instructions'},render:()=>h(EmailPreview,{subject:'FICTIONAL / FICTICIO',body:'Preview only / Solo vista previa',previewContent:h(PaymentInstructions,{status:'ready',view:projectPaymentInstructions(null)})})},{ title: { es: 'Clase cancelada', en: 'Class cancelled' }, render: () => h(EmailPreview, {
    envelope: 'HOY <hola@hoy.co> → mariana@…  ·  ES',
    subject: 'Tu clase de {{class_name}} fue cancelada',
    body: 'Hola {{first_name}},\n\nLa clase de {{class_name}} del {{class_datetime}} con {{teacher_name}} fue cancelada. Te devolvimos {{classes_returned}} clase a tu paquete.\n\nElige otra clase cuando quieras.',
    cta: { label: 'Ver horario', href: 'hoyapp://classes?date={{date}}' },
    footer: `${tenant.legalName} · ${tenant.city} · Recibes este correo porque tienes una cuenta en ${tenant.name}.`,
    vars: { first_name: 'Mariana', class_name: 'Fuego', teacher_name: 'Andrés', classes_returned: '1' },
  }) }],
  a11y: [{ es: 'role=img (group con contenido adicional) con el asunto como nombre; el CTA no navega en la vista previa.', en: 'role=img (group with additional content) named by the subject; the CTA does not navigate in preview.' }],
  usedBy: ['M-04', 'M-14', 'C-11', 'S-04', 'S-09', 'C-37'],
});
