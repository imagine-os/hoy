import { allowedEvent, type MeasurementEvent } from './pixelPolicy';

const FRAME_PATH = '/meta-measurement-frame.html';
const MAX_PENDING = 16;

/**
 * Isolate the vendor from the app URL, referrer, DOM, and origin storage.
 * The production application does not instantiate this transport.
 */
export function createMetaTransport() {
  let frame: HTMLIFrameElement | null = null;
  let ready = false;
  let pending: MeasurementEvent[] = [];
  function send(event: MeasurementEvent) {
    // The sandboxed target has an opaque origin; never send an identifier, URL, or arbitrary object.
    frame?.contentWindow?.postMessage({ type: 'hoy.meta.event.v1', event }, '*');
  }
  function stop() {
    frame?.remove();
    frame = null;
    ready = false;
    pending = [];
  }
  function emit(event: MeasurementEvent) {
    const vetted = allowedEvent(event);
    if (!vetted) return;
    if (ready) { send(vetted); return; }
    if (pending.length >= MAX_PENDING) return;
    pending.push(vetted);
    if (frame) return;
    const candidate = document.createElement('iframe');
    candidate.hidden = true;
    candidate.title = 'Advertising measurement';
    candidate.setAttribute('sandbox', 'allow-scripts');
    candidate.referrerPolicy = 'no-referrer';
    candidate.src = new URL(FRAME_PATH, window.location.origin).href;
    candidate.addEventListener('load', () => {
      if (candidate !== frame) return;
      ready = true;
      const queued = pending;
      pending = [];
      for (const item of queued) send(item);
    }, { once: true });
    frame = candidate;
    document.body.append(candidate);
  }
  return { emit, stop };
}
