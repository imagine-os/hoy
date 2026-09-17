/**
 * M-10 — Integraciones. The one place that says what each external system is for, which
 * NON-SECRET fields the owner can fill in ahead of the dev (merchant ids, sender numbers, provider
 * names, project URLs) and what the dev still has to finish. Secrets (private keys, tokens, webhook
 * secrets) never enter this file, the `integrations` table or the browser: they live in server
 * environment variables, exactly as the M-08c notice has said since 0.5.0.
 *
 * Status is a three-step chip the owner moves by hand: `simulated` (the seam exists, nothing external
 * is called) → `configured` (the ids are filled in, the dev has not wired it) → `connected` (live).
 * Every save writes an `audit_log` row (`integration.update`).
 *
 * This file is pure (no React, no provider) so the seed can import it; the hooks live in ./integrations.ts.
 */
import type { IntegrationKey, IntegrationRow, IntegrationStatus } from '../../data/schema';
import type { Bi } from '../../specs/types';

export interface IntegrationField { name: string; label: Bi; placeholder?: string; hint?: Bi }
export interface IntegrationDef {
  key: IntegrationKey;
  name: Bi;
  body: Bi;
  /** What the seam does today, so nobody promises more (manual chapter 26). */
  simulated: Bi;
  fields: IntegrationField[];
  /** What the dev must finish, in order. */
  checklist: Bi[];
  /** Which secrets exist for this integration and where they live — named, never stored. */
  secrets: string[];
  /** Screens that read this integration. */
  screens: string[];
  /** Manual chapter slug (`/manual/<slug>`). */
  manual: string;
}

export const INTEGRATION_STATUSES: readonly IntegrationStatus[] = ['simulated', 'configured', 'connected'];

export const INTEGRATIONS: IntegrationDef[] = [
  {
    key: 'wompi',
    name: { es: 'Wompi · pagos y payouts', en: 'Wompi · payments and payouts' },
    body: { es: 'Link de pago, tarjeta, PSE y Nequi para los clientes; dispersión de la nómina de profesores.', en: 'Payment link, card, PSE and Nequi for members; teacher payroll dispersion.' },
    simulated: { es: 'wompiCheckout() y wompiPayout() esperan y resuelven con una referencia ficticia; los pagos y las corridas ya se escriben como filas reales.', en: 'wompiCheckout() and wompiPayout() wait and resolve with a fake reference; payments and runs are already written as real rows.' },
    fields: [
      { name: 'merchantId', label: { es: 'ID de comercio', en: 'Merchant id' }, placeholder: 'mer_…' },
      { name: 'publicKey', label: { es: 'Llave pública', en: 'Public key' }, placeholder: 'pub_prod_…', hint: { es: 'La pública sí puede vivir aquí: va en el checkout del navegador.', en: 'The public key may live here: it goes in the browser checkout.' } },
      { name: 'settlementAccount', label: { es: 'Cuenta de recaudo (últimos 4)', en: 'Settlement account (last 4)' }, placeholder: '····1234' },
      { name: 'payoutAccount', label: { es: 'Cuenta de dispersión (últimos 4)', en: 'Dispersion account (last 4)' }, placeholder: '····5678' },
    ],
    checklist: [
      { es: 'Crear el comercio en Wompi y pedir credenciales de sandbox y producción.', en: 'Create the merchant in Wompi and request sandbox and production credentials.' },
      { es: 'Poner la llave privada y el secreto de eventos en variables de entorno del servidor.', en: 'Put the private key and the events secret in server environment variables.' },
      { es: 'Reemplazar el cuerpo de wompiCheckout() / wompiPayout() por la llamada real.', en: 'Replace the body of wompiCheckout() / wompiPayout() with the real call.' },
      { es: 'Webhook del lado servidor que confirma el pago y la dispersión y actualiza payments / payroll_runs.', en: 'Server-side webhook that confirms the payment and the dispersion and updates payments / payroll_runs.' },
      { es: 'Cambiar el entorno a producción en M-08c.', en: 'Switch the environment to production in M-08c.' },
    ],
    secrets: ['WOMPI_PRIVATE_KEY', 'WOMPI_EVENTS_SECRET'],
    screens: ['C-04', 'C-05', 'S-04', 'M-09', 'M-09a', 'M-09b'],
    manual: '26-integraciones',
  },
  {
    key: 'whatsapp',
    name: { es: 'WhatsApp Business (Meta)', en: 'WhatsApp Business (Meta)' },
    body: { es: 'Plantillas aprobadas, OTP de acceso, automatizaciones y los hilos del CRM.', en: 'Approved templates, sign-in OTP, automations and the CRM threads.' },
    simulated: { es: 'Todo envío cae en message_log con estado sent; el OTP de C-21 se muestra en pantalla.', en: 'Every send lands in message_log as sent; the C-21 OTP is shown on screen.' },
    fields: [
      { name: 'senderNumber', label: { es: 'Número emisor', en: 'Sender number' }, placeholder: '+57 3…' },
      { name: 'wabaId', label: { es: 'WABA id', en: 'WABA id' }, placeholder: '1000…' },
      { name: 'phoneNumberId', label: { es: 'Phone number id', en: 'Phone number id' }, placeholder: '1234…' },
      { name: 'templateNamespace', label: { es: 'Namespace de plantillas', en: 'Template namespace' }, placeholder: 'a1b2c3…' },
      { name: 'displayName', label: { es: 'Nombre aprobado por Meta', en: 'Meta-approved display name' } },
    ],
    checklist: [
      { es: 'Verificar el negocio en Meta Business y pedir el remitente (la aprobación tarda: empezar antes de Supabase).', en: 'Verify the business in Meta Business and request the sender (approval has a lead time: start before Supabase is done).' },
      { es: 'Enviar a aprobación las plantillas de wa_templates en ES y EN.', en: 'Submit the wa_templates rows for approval in ES and EN.' },
      { es: 'Token permanente en variables de entorno; webhook de estados y respuestas hacia message_log.', en: 'Permanent token in environment variables; status and reply webhook into message_log.' },
      { es: 'Reemplazar el simulador de M-05 y el OTP de C-21 por la Cloud API.', en: 'Replace the M-05 simulator and the C-21 OTP with the Cloud API.' },
    ],
    secrets: ['META_WA_TOKEN', 'META_WEBHOOK_VERIFY_TOKEN'],
    screens: ['C-21', 'M-05', 'M-06', 'M-08d'],
    manual: '26-integraciones',
  },
  {
    key: 'email',
    name: { es: 'Correo transaccional', en: 'Transactional email' },
    body: { es: 'Recibos, recordatorios, reportes y los avisos que diseña M-04.', en: 'Receipts, reminders, reports and the notices M-04 designs.' },
    simulated: { es: 'M-04 diseña y previsualiza; nada se envía. El remitente y el reply-to viven en M-08d.', en: 'M-04 designs and previews; nothing is sent. Sender and reply-to live in M-08d.' },
    fields: [
      { name: 'provider', label: { es: 'Proveedor', en: 'Provider' }, placeholder: 'Resend · Postmark · SES · Brevo' },
      { name: 'senderDomain', label: { es: 'Dominio de envío', en: 'Sending domain' }, placeholder: 'mail.hoy.co' },
      { name: 'fromAddress', label: { es: 'Dirección From', en: 'From address' }, placeholder: 'hola@…' },
    ],
    checklist: [
      { es: 'Elegir proveedor y verificar el dominio (SPF, DKIM, DMARC).', en: 'Pick the provider and verify the domain (SPF, DKIM, DMARC).' },
      { es: 'API key en variables de entorno del servidor.', en: 'API key in server environment variables.' },
      { es: 'Paso MJML → HTML para email_templates y una función de envío que escribe message_log.', en: 'MJML → HTML step for email_templates and a send function that writes message_log.' },
    ],
    secrets: ['EMAIL_API_KEY'],
    screens: ['M-04', 'M-08d', 'C-11'],
    manual: '26-integraciones',
  },
  {
    key: 'dian',
    name: { es: 'Facturación electrónica (DIAN)', en: 'E-invoicing (DIAN)' },
    body: { es: 'Factura electrónica con CUFE por cada pago aprobado, a través de un proveedor tecnológico autorizado.', en: 'Electronic invoice with a CUFE for every approved payment, through an authorised technology provider.' },
    simulated: { es: 'invoices tiene la forma de la factura; no se emite CUFE. M-09 muestra una insignia en la columna.', en: 'invoices has the invoice shape; no CUFE is emitted. M-09 shows a badge in the column.' },
    fields: [
      { name: 'provider', label: { es: 'Proveedor tecnológico', en: 'Technology provider' }, placeholder: 'Alegra · Siigo · Factus · …' },
      { name: 'issuerNit', label: { es: 'NIT del emisor legal', en: 'Legal issuer NIT' }, placeholder: '901.xxx.xxx-1' },
      { name: 'resolution', label: { es: 'Resolución DIAN', en: 'DIAN resolution' }, placeholder: '18764…', hint: { es: 'También en M-08c, que es donde se enciende la facturación.', en: 'Also in M-08c, where invoicing is switched on.' } },
      { name: 'prefix', label: { es: 'Prefijo de numeración', en: 'Numbering prefix' }, placeholder: 'HOY' },
    ],
    checklist: [
      { es: 'Nombrar el emisor legal y contratar el proveedor (decisión del owner, ROADMAP §E 3).', en: 'Name the legal issuer and contract the provider (owner decision, ROADMAP §E 3).' },
      { es: 'Credenciales del proveedor en variables de entorno; emitir el CUFE desde el servidor al aprobar un pago.', en: 'Provider credentials in environment variables; emit the CUFE server-side when a payment is approved.' },
      { es: 'Guardar CUFE y PDF en invoices; encender “Facturación electrónica” en M-08c.', en: 'Store the CUFE and PDF on invoices; switch “Electronic invoicing” on in M-08c.' },
    ],
    secrets: ['DIAN_PROVIDER_TOKEN'],
    screens: ['M-08c', 'M-09', 'C-11', 'S-04'],
    manual: '26-integraciones',
  },
  {
    key: 'maps',
    name: { es: 'Mapas', en: 'Maps' },
    body: { es: 'El mapa de la página de contacto (W-06). Sin llave con OpenStreetMap; con llave con Google.', en: 'The map on the contact page (W-06). Key-less with OpenStreetMap; keyed with Google.' },
    simulated: { es: 'MapSlot dibuja un marco de marca con la dirección y un enlace a Google Maps; el proveedor se elige en M-08f.', en: 'MapSlot draws a branded frame with the address and a Google Maps link; the provider is picked in M-08f.' },
    fields: [
      { name: 'placeId', label: { es: 'Google Place id (opcional)', en: 'Google Place id (optional)' }, placeholder: 'ChIJ…' },
      { name: 'shareLink', label: { es: 'Enlace de Google Maps', en: 'Google Maps share link' }, placeholder: 'https://maps.app.goo.gl/…', hint: { es: 'Las coordenadas se editan en M-08a.', en: 'Coordinates are edited in M-08a.' } },
    ],
    checklist: [
      { es: 'Elegir proveedor en M-08f (none · osm · google).', en: 'Pick the provider in M-08f (none · osm · google).' },
      { es: 'Si es Google con llave: restringir la llave al dominio y ponerla en el build, no en el repo.', en: 'If keyed Google: restrict the key to the domain and inject it at build time, never in the repo.' },
    ],
    secrets: ['GOOGLE_MAPS_KEY (only for the keyed embed)'],
    screens: ['W-06', 'M-08a', 'M-08f'],
    manual: '26-integraciones',
  },
  {
    key: 'supabase',
    name: { es: 'Supabase · auth, datos y realtime', en: 'Supabase · auth, data and realtime' },
    body: { es: 'Inicio de sesión real, Postgres con RLS por tenant y cambios en vivo. Es la puerta: todo lo demás necesita un usuario autenticado.', en: 'Real sign-in, Postgres with per-tenant RLS and live changes. It is the gate: everything else needs an authenticated user.' },
    simulated: { es: 'MockProvider (localStorage) detrás de la misma interfaz DataProvider; el acceso es un selector de demo.', en: 'MockProvider (localStorage) behind the same DataProvider interface; sign-in is a demo picker.' },
    fields: [
      { name: 'projectUrl', label: { es: 'URL del proyecto', en: 'Project URL' }, placeholder: 'https://xxxx.supabase.co' },
      { name: 'anonKey', label: { es: 'Anon key (pública)', en: 'Anon key (public)' }, placeholder: 'eyJ…', hint: { es: 'Pública por diseño; la service role nunca.', en: 'Public by design; the service role never.' } },
      { name: 'region', label: { es: 'Región', en: 'Region' }, placeholder: 'us-east-1' },
    ],
    checklist: [
      { es: 'Crear el proyecto; aplicar supabase/schema.sql y las políticas RLS (referencia en reference/alt-build-empty10).', en: 'Create the project; apply supabase/schema.sql and the RLS policies (reference in reference/alt-build-empty10).' },
      { es: 'Implementar SupabaseProvider con la misma interfaz que MockProvider y cambiarlo en DataContext.', en: 'Implement SupabaseProvider behind the MockProvider interface and swap it in DataContext.' },
      { es: 'Reemplazar el selector de demo por Supabase Auth (A-02 / A-03 / C-21) y migrar la semilla.', en: 'Replace the demo picker with Supabase Auth (A-02 / A-03 / C-21) and migrate the seed.' },
    ],
    secrets: ['SUPABASE_SERVICE_ROLE_KEY'],
    screens: ['A-02', 'A-03', 'C-21', 'M-03'],
    manual: '26-integraciones',
  },
];

export const integrationDef = (key: IntegrationKey) => INTEGRATIONS.find((d) => d.key === key)!;


/** How many of a row's fields are filled — the card's progress line. */
export const filledCount = (def: IntegrationDef, row: IntegrationRow | undefined) => def.fields.filter((f) => !!row?.config?.[f.name]?.trim()).length;
