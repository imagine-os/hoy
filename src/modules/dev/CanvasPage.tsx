import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { getRoutes } from '../../app/registry';
import { routeManifest } from '../../app/manifest';
import type { RouteDef } from '../../specs/types';
import type { Bi } from '../../specs/types';
import { Badge } from '../../components/atom/Badge/Badge';
import { SegmentedControl } from '../../components/molecule/SegmentedControl/SegmentedControl';
import { PagePreview } from '../../components/organism/PagePreview/PagePreview';
import './canvas.css';

type GroupKey = 'hub' | 'website' | 'auth' | 'customer' | 'teacher' | 'staff' | 'admin' | 'dev' | 'docs';

const GROUPS: { key: GroupKey; label: Bi; hue: string }[] = [
  { key: 'hub', label: { es: 'Hub', en: 'Hub' }, hue: 'dev' },
  { key: 'website', label: { es: 'Sitio web', en: 'Website' }, hue: 'site' },
  { key: 'auth', label: { es: 'Acceso', en: 'Auth' }, hue: 'app' },
  { key: 'customer', label: { es: 'Clientes', en: 'Customer' }, hue: 'app' },
  { key: 'teacher', label: { es: 'Profesores', en: 'Teacher' }, hue: 'teacher' },
  { key: 'staff', label: { es: 'Staff', en: 'Staff' }, hue: 'desk' },
  { key: 'admin', label: { es: 'Administración', en: 'Admin' }, hue: 'admin' },
  { key: 'dev', label: { es: 'Desarrollo', en: 'Dev' }, hue: 'dev' },
  { key: 'docs', label: { es: 'Documentación', en: 'Docs' }, hue: 'docs' },
];

function groupOf(r: RouteDef): GroupKey {
  if (r.path === '/hub' || r.path === '/no-access') return 'hub';
  if (r.path.startsWith('/auth')) return 'auth';
  if (r.surface === 'public') return 'website';
  return r.surface;
}

type Zoom = 's' | 'm' | 'l' | 'xl';
const ZOOM: Record<Zoom, number> = { s: 180, m: 240, l: 320, xl: 440 };

/**
 * D-05 — every page of the system as a capture tile, grouped by surface.
 * Static thumbnails only: this is the map of the whole product, so nothing here boots a live frame.
 */
export function CanvasPage() {
  const { t, bi } = useI18n();
  const { devMode } = useSession();
  const [zoom, setZoom] = useState<Zoom>('m');

  const tiles = useMemo(() => {
    const routes = getRoutes().filter((r) => !r.path.includes(':') && !r.path.includes('*'));
    const manifest = routeManifest(routes);
    return GROUPS.map((g) => ({
      ...g,
      // One tile per route, never per code: routes that share a page code (a list and its
      // detail view, a surface and its alias) each get their own tile on purpose.
      items: routes.filter((r) => groupOf(r) === g.key).map((r) => ({
        path: r.path, code: r.spec.code, name: bi(r.spec.name),
        status: manifest.find((m) => m.path === r.path)?.status ?? 'stub',
      })),
    })).filter((g) => g.items.length);
  }, [bi]);

  const total = tiles.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="stack canvasview" style={{ ['--zoom' as string]: `${ZOOM[zoom]}px` }}>
      <div className="page-head">
        <div>
          <h1>{t('dev.canvas.title')}</h1>
          <p className="muted small">{t('dev.canvas.body', { n: total })}</p>
        </div>
        <SegmentedControl
          ariaLabel={t('dev.canvas.zoom')} value={zoom} onChange={setZoom} size="sm"
          options={[{ value: 's', label: 'S' }, { value: 'm', label: 'M' }, { value: 'l', label: 'L' }, { value: 'xl', label: 'XL' }]}
        />
      </div>

      {tiles.map((g) => (
        <section key={g.key} className="canvas-group" aria-labelledby={`cv-${g.key}`}>
          <h2 id={`cv-${g.key}`} className="canvas-grouphead">
            {bi(g.label)} <span className="muted small">· {g.items.length}</span>
          </h2>
          <ul className="canvas-grid">
            {g.items.map((it) => (
              <li key={`${g.key}-${it.path}`}>
                <Link className="canvas-tile" to={it.path} style={{ ['--hue' as string]: `var(--hue-${g.hue})` }}>
                  <PagePreview code={it.code} route={it.path} name={it.name} shape={g.key === 'customer' || g.key === 'teacher' ? 'phone' : 'desktop'} />
                  <span className="canvas-tile-name">{it.name}</span>
                  <span className="canvas-tile-meta xs muted">
                    <code>{it.code}</code> <code>{it.path}</code>
                    {devMode && it.status === 'stub' && <Badge tone="warn">{t('dev.specs.stub')}</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
