import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { getRoutes } from '../../app/registry';
import { demoUsers } from '../../auth/demoUsers';
import { ROLE_LABEL, type Role } from '../../auth/roles';
import { frameUrl } from '../../app/frameSession';
import { Select } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { SegmentedControl } from '../../components/molecule/SegmentedControl/SegmentedControl';
import { DeviceFrame, DEVICE_PRESETS, type DevicePreset } from '../../components/organism/DeviceFrame/DeviceFrame';
import './simulator.css';

const PRESETS: DevicePreset[] = ['phone', 'tablet', 'desktop', 'tv'];
const isPreset = (v: string | null): v is DevicePreset => !!v && (PRESETS as string[]).includes(v);

/**
 * D-06 — any route, on any device, as anyone.
 * Every control writes to the hash query, so a view is a link you can paste in Slack.
 */
export function SimulatorPage() {
  const { t, bi, lang } = useI18n();
  const [params, setParams] = useSearchParams();

  const routes = useMemo(
    () => getRoutes().filter((r) => !r.path.includes(':') && !r.path.includes('*')).map((r) => ({ path: r.path, code: r.spec.code, name: bi(r.spec.name) })),
    [bi],
  );

  const raw = params.get('route') ?? '/app';
  const route = routes.some((r) => r.path === raw) ? raw : '/app';
  const preset: DevicePreset = isPreset(params.get('device')) ? (params.get('device') as DevicePreset) : 'phone';
  const as = (params.get('as') ?? 'customer') as Role;
  const frameLang = params.get('lang') === 'en' ? 'en' : params.get('lang') === 'es' ? 'es' : lang;
  const frameTheme = params.get('theme') === 'dark' ? 'dark' : 'light';

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const current = routes.find((r) => r.path === route);
  const size = DEVICE_PRESETS[preset];
  const href = frameUrl(route, { as, lang: frameLang, theme: frameTheme, dev: false });

  return (
    <div className="stack simview">
      <div className="page-head">
        <div>
          <h1>{t('dev.sim.title')}</h1>
          <p className="muted small">{t('dev.sim.body')}</p>
        </div>
        <a className="small" href={href} target="_blank" rel="noreferrer">{t('dev.sim.openTab')} ↗</a>
      </div>

      <div className="sim-controls">
        <SegmentedControl
          ariaLabel={t('dev.sim.device')} value={preset} onChange={(v) => set('device', v)}
          options={PRESETS.map((p) => ({ value: p, label: t(DEVICE_PRESETS[p].labelKey) }))}
        />
        <Field label={t('dev.sim.route')}>
          {(id) => (
            <Select id={id} value={route} onChange={(e) => set('route', e.target.value)}>
              {routes.map((r) => <option key={r.path} value={r.path}>{r.name} · {r.code} · {r.path}</option>)}
            </Select>
          )}
        </Field>
        <Field label={t('dev.sim.as')}>
          {(id) => (
            <Select id={id} value={as} onChange={(e) => set('as', e.target.value)}>
              {demoUsers.map((u) => <option key={u.id} value={u.role}>{u.name} · {bi(ROLE_LABEL[u.role])}</option>)}
            </Select>
          )}
        </Field>
        <SegmentedControl
          ariaLabel={t('core.lang.toggle')} value={frameLang} onChange={(v) => set('lang', v)} size="sm"
          options={[{ value: 'es', label: 'ES' }, { value: 'en', label: 'EN' }]}
        />
        <SegmentedControl
          ariaLabel={t('core.theme.toggle')} value={frameTheme} onChange={(v) => set('theme', v)} size="sm"
          options={[{ value: 'light', label: t('core.theme.light') }, { value: 'dark', label: t('core.theme.dark') }]}
        />
      </div>

      <p className="xs muted sim-size">{size.w} × {size.h} · <code>{route}</code> · {current?.code}</p>

      <div className="sim-stage">
        <DeviceFrame
          key={`${route}|${preset}|${as}|${frameLang}|${frameTheme}`}
          route={route} preset={preset} as={as} lang={frameLang} theme={frameTheme}
          title={t('core.preview.of', { name: current?.name ?? route })} chrome lazy={false}
        />
      </div>
    </div>
  );
}
