import { createElement as h } from 'react';
import { defineMeta } from '../../../design/meta';
import { PurchaseRecoveryNotice } from './PurchaseRecoveryNotice';

export default defineMeta({ tier: 'molecule', name: 'PurchaseRecoveryNotice',
  description: { es: 'Resultado de compra pendiente de verificar; revisar abre los datos guardados sin cobrar.', en: 'A purchase outcome needs verification; review opens saved details without charging.' },
  props: [{ name: 'blocked / failed', type: 'boolean', description: { es: 'Datos no disponibles o fallo al confirmar el resultado; nunca afirma que no hubo cobro.', en: 'Unavailable data or an unconfirmed outcome; never claims no charge occurred.' } }, { name: 'onReview', type: '() => void', description: { es: 'Abre la confirmación guardada; no ejecuta un pago.', en: 'Opens saved confirmation; does not execute a payment.' } }],
  states: ['uncertain', 'read failure', 'unavailable retained record', 'review action'],
  usages: [
    { title: { es: 'Compra guardada por revisar', en: 'Saved purchase to review' }, render: () => h(PurchaseRecoveryNotice, { onReview: () => {} }) },
    { title: { es: 'No se confirmó el resultado', en: 'Outcome could not be confirmed' }, render: () => h(PurchaseRecoveryNotice, { failed: true }) },
    { title: { es: 'Datos guardados no disponibles', en: 'Saved data unavailable' }, render: () => h(PurchaseRecoveryNotice, { blocked: true }) },
  ], a11y: [{ es: 'El texto explica la incertidumbre y no depende solo del color. Revisar es distinto de reintentar el pago.', en: 'Text explains uncertainty without relying on colour. Reviewing is distinct from retrying payment.' }], usedBy: ['C-06', 'C-07b'] });
