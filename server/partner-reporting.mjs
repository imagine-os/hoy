import { createCompanyOsRead } from './company-os-read.mjs';
import { createPartnerHandler } from './report.mjs';

export const PARTNER_REPORT_PATH = '/v1/reports/activity';
const DAY = 86_400_000;
const TIMEOUT = 8_000;
const MAX_BYTES = 2 * 1024 * 1024;

export function partnerSettings(env, environment, gateOn, publicReadToken = null) {
  if (environment !== 'test' || !gateOn || env.HOY_PARTNER_TEST_ENABLE !== 'true') return null;
  const { HOY_PARTNER_TEST_KEY: key, HOY_PARTNER_TEST_UPSTREAM_KEY: upstreamKey, HOY_PARTNER_TEST_HISTORY_FROM: historyFrom, HOY_PARTNER_TEST_EXPIRES_AT: rawExpiry } = env;
  const expiresAt = Date.parse(rawExpiry);
  let productObject;
  try { productObject = JSON.parse(env.HOY_PARTNER_TEST_PRODUCTS ?? '{}'); } catch { /* rejected below */ }
  const historyValid = typeof historyFrom === 'string' && /^20\d{2}-\d\d-\d\d$/.test(historyFrom) &&
    Number.isFinite(Date.parse(historyFrom)) && new Date(historyFrom).toISOString().slice(0,10) === historyFrom;
  if (!/^p_test_[A-Za-z0-9_-]{32,100}$/.test(key ?? '') ||
      !/^cos_svc_[0-9a-f-]{36}_[A-Za-z0-9_-]{43}$/.test(upstreamKey ?? '') || upstreamKey === publicReadToken ||
      !historyValid || !Number.isFinite(expiresAt) || !productObject || typeof productObject !== 'object' || Array.isArray(productObject)) {
    throw Error('Invalid partner reporting test configuration');
  }
  const entries = Object.entries(productObject);
  if (entries.length > 100 || entries.some(([id, slug]) => !/^[a-zA-Z0-9_-]{1,80}$/.test(id) || typeof slug !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(slug)))
    throw Error('Invalid partner reporting test product list');
  return { key, upstreamKey, historyFrom, expiresAt, products: new Map(entries) };
}

function limitedJson(response) {
  return (async () => {
    if (!response.ok || !response.body || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') ?? '')) {
      await response.body?.cancel().catch(() => {});
      throw Error('report_source_unavailable');
    }
    const reader = response.body.getReader();
    const chunks = []; let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) throw Error('report_source_unavailable');
        chunks.push(value);
      }
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  })();
}

export function makePartnerRoute(config, { request = fetch, now = Date.now } = {}) {
  const partner = config.partnerReport;
  if (config.environment !== 'test' || !config.testGate?.on || !partner) return null;
  let inFlight = 0, nextRead = 0;
  const handler = createPartnerHandler({
    tenant: config.tenant, token: partner.key, catalog: partner.products,
    read: async ({ tenant, start, end, limit }) => {
      const time = now();
      if (inFlight || time < nextRead) throw Error('report_busy');
      inFlight++; nextRead = time + 1_000;
      try {
        const signal = AbortSignal.timeout(TIMEOUT);
        const send = async (path, method, spec) => {
          const headers = { Authorization: 'Bearer ' + partner.upstreamKey, Accept: 'application/json' };
          if (spec) headers['Content-Type'] = 'application/json';
          return limitedJson(await request(new URL(path, config.companyOsUrl), {
            method, headers, ...(spec ? { body: JSON.stringify(spec) } : {}), redirect: 'error', signal,
          }));
        };
        const read = createCompanyOsRead({
          tenant: config.tenant,
          query: ({ path, method, spec }) => send(path, method, spec),
          readSignups: async ({ start, end }) => {
            const label = edge => new Date(Date.parse(edge) - 5 * 3_600_000).toISOString().slice(0,10);
            const from = label(start), to = label(new Date(Date.parse(end) - DAY).toISOString());
            if (from < partner.historyFrom) throw Error('report_source_unavailable');
            const result = await send('/t/' + config.tenant + '/reporting/signup-counts?' +
              new URLSearchParams({ from, to, offsetMinutes: '-300' }), 'GET');
            return { complete: result?.source === 'retained_self_signup_events', rows: result?.rows };
          },
        });
        return await read({ tenant, start, end, limit });
      } finally { inFlight--; }
    },
  });
  return (req, res) => {
    if (now() >= partner.expiresAt) {
      res.writeHead(404, { 'Cache-Control': 'private, no-store' }); return res.end();
    }
    return handler(req, res);
  };
}
