import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { LaunchNotificationPreview } from './LaunchNotificationPreview';
import type { LaunchPreviewPayload } from '../../../modules/launch-notifications/contracts';
const sample: LaunchPreviewPayload = { event: 'payment-confirmed', status: 'unsent-preview', sourceId: 'fictional-payment', ownerId: 'fictional-owner', recipient: { kind: 'account', name: 'Fictional Member', email: 'member@example.test', locale: 'es' }, template: { kind: 'builtin-mock', key: 'nt02.payment-confirmed', contractRevision: 1 }, subject: { es: 'Confirmación ficticia', en: 'Fictional confirmation' }, body: { es: 'Este pago es ficticio. No se envió ningún email.', en: 'This payment is fictional. No email was sent.' } };
export default defineMeta({
  tier: 'organism', name: 'LaunchNotificationPreview',
  description: { es: 'Vista previa local sin enviar, con fuente y destinatario verificables; la plantilla guardada conserva su versión y estado, o se identifica el contrato mock integrado.', en: 'Local unsent preview with source and recipient provenance; a saved template retains its version/state, or an explicit built-in mock contract is identified.' },
  props: [{ name: 'result', type: 'LaunchPreviewResult', required: true, description: { es: 'Estado explícito; nunca texto de un error del proveedor.', en: 'Explicit result; never raw provider error text.' } }, { name: 'onRetry', type: '() => void', description: { es: 'Vuelve a leer la misma fuente; no repite la acción original.', en: 'Reads the same source again; does not repeat the original action.' } }],
  states: ['loading', 'ready builtin mock', 'ready saved active', 'ready saved inactive', 'source unavailable', 'read error / retry', 'cancelled hidden'],
  usages: [
    { title: { es: 'Contrato mock, sin enviar', en: 'Mock contract, unsent' }, render: () => h(LaunchNotificationPreview, { result: { status: 'ready', payload: sample } }) },
    { title: { es: 'Guardada e inactiva', en: 'Saved and inactive' }, render: () => h(LaunchNotificationPreview, { result: { status: 'ready', payload: { ...sample, event: 'welcome', template: { kind: 'saved', key: 'welcome', id: 'fictional-template', version: 2, active: false } } } }) },
    { title: { es: 'Guardada y activa', en: 'Saved and active' }, render: () => h(LaunchNotificationPreview, { result: { status: 'ready', payload: { ...sample, event: 'welcome', template: { kind: 'saved', key: 'welcome', id: 'fictional-template', version: 2, active: true } } } }) },
    { title: { es: 'Leyendo', en: 'Reading' }, render: () => h(LaunchNotificationPreview, { result: { status: 'loading', event: 'welcome' } }) },
    { title: { es: 'Sin fuente exacta', en: 'No exact source' }, render: () => h(LaunchNotificationPreview, { result: { status: 'unavailable', event: 'payment-confirmed', reason: 'source-unavailable' } }) },
    { title: { es: 'Error de lectura', en: 'Read error' }, render: () => h(LaunchNotificationPreview, { result: { status: 'error', event: 'rescheduled' }, onRetry: () => {} }) },
  ],
  a11y: [{ es: 'Contenido de email en un grupo accesible, lang y dir explícitos. El host ofrece un control no modal; Drawer solo se abre con una acción.', en: 'Email content is an accessible group with explicit lang and dir. The host offers a nonmodal control; Drawer opens only through an action.' }],
  usedBy: ['A-02', 'A-03', 'C-04', 'C-08', 'NT-02'],
});
