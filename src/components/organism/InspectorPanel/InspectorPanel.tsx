import { Link } from 'react-router-dom';
import type { PageSpec } from '../../../specs/types';
import { specCompleteness } from '../../../specs/types';
import { useI18n } from '../../../i18n/I18nProvider';
import { ROLE_LABEL } from '../../../auth/roles';
import { tableRegistry } from '../../../data/schema';
import { Drawer } from '../Drawer/Drawer';
import { Badge } from '../../atom/Badge/Badge';
import { Chip } from '../../atom/Chip/Chip';
import './InspectorPanel.css';

export interface InspectorPanelProps { spec: PageSpec | null; open: boolean; onClose: () => void; routePath?: string }

function Section({ title, children, empty }: { title: string; children?: React.ReactNode; empty?: boolean }) {
  return (
    <section className="insp-section">
      <h4 className="insp-h">{title}</h4>
      {empty ? <p className="muted small">—</p> : children}
    </section>
  );
}

/** The spec side panel: everything the inspector knows about the current route. */
export function InspectorPanel({ spec, open, onClose, routePath }: InspectorPanelProps) {
  const { bi, lang } = useI18n();
  const L = (es: string, en: string) => (lang === 'es' ? es : en);
  if (!spec) return null;
  const { score, missing } = specCompleteness(spec);
  return (
    <Drawer open={open} onClose={onClose} width={460} title={
      <div className="row wrap">
        <code className="insp-code">{spec.code}</code>
        <h3 className="insp-title">{bi(spec.name)}</h3>
        <Badge tone={score === 100 ? 'success' : score >= 70 ? 'warn' : 'danger'}>{score}%</Badge>
      </div>
    }>
      <div className="insp">
        <Section title={L('Propósito', 'Purpose')}><p>{bi(spec.purpose)}</p>{spec.story && <p className="muted small insp-story">“{spec.story}”</p>}</Section>
        {routePath && <Section title={L('Ruta', 'Route')}><code>#{routePath}</code></Section>}
        <Section title={L('Layout (orden de componentes)', 'Layout (component order)')} empty={!spec.layout.length}>
          <ol className="insp-layout">{spec.layout.map((l, i) => <li key={i}>{l}</li>)}</ol>
          <div className="row wrap" style={{ marginTop: 8 }}>
            <Link className="small" to={`/dev/layout/${encodeURIComponent(spec.code)}`}>{L('Reordenar en el editor →', 'Reorder in the layout editor →')}</Link>
          </div>
          {spec.layerTree && <details className="insp-details"><summary className="small muted">{L('Árbol completo', 'Full tree')}</summary><pre className="xs">{spec.layerTree}</pre></details>}
        </Section>
        <Section title={L('Datos (tablas)', 'Data (tables)')} empty={!spec.data.length}>
          <div className="row wrap">
            {spec.data.map((d) => tableRegistry[d]
              ? <Link key={d} to={`/admin/tables/${d}`} className="insp-table is-known"><code>{d}</code></Link>
              : <span key={d} className="insp-table" title={L('Aún no existe en schema.ts', 'Not in schema.ts yet')}><code>{d}</code></span>)}
          </div>
          <p className="xs muted" style={{ marginTop: 6 }}>{L('Azul = existe en el schema y abre el gestor de tablas.', 'Blue = exists in the schema and opens the table manager.')}</p>
        </Section>
        <Section title={L('Roles con acceso', 'Roles with access')} empty={!spec.roles.length}>
          <div className="row wrap">{spec.roles.map((r) => <Chip key={r}>{bi(ROLE_LABEL[r])}</Chip>)}</div>
        </Section>
        <Section title={L('Lógica y cálculos', 'Logic & calculations')} empty={!spec.logic.length}><ul className="insp-list">{spec.logic.map((r, i) => <li key={i}>{r}</li>)}</ul></Section>
        <Section title={L('Integraciones', 'Integrations')} empty={!spec.integrations.length}><div className="row wrap">{spec.integrations.map((r) => <Badge key={r} tone="primary">{r}</Badge>)}</div></Section>
        {spec.api && <Section title="API"><ul className="insp-list mono xs">{spec.api.map((a, i) => <li key={i}>{a}</li>)}</ul></Section>}
        <Section title={L('Estados', 'States')} empty={!spec.states?.length}><ul className="insp-list">{spec.states?.map((s, i) => <li key={i}>{s}</li>)}</ul></Section>
        <Section title={L('Interruptores (Admin → Features)', 'Toggles (Admin → Features)')} empty={!spec.toggles?.length}>
          <ul className="insp-list">{spec.toggles?.map((tg, i) => <li key={i} className="row-between"><span>{tg.label}</span><Badge tone={tg.on ? 'success' : 'neutral'}>{tg.on ? 'on' : 'off'}</Badge></li>)}</ul>
        </Section>
        {spec.notes?.length ? <Section title={L('Notas', 'Notes')}><ul className="insp-list">{spec.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></Section> : null}
        {missing.length > 0 && <Section title={L('Falta en la spec', 'Missing from spec')}><div className="row wrap">{missing.map((m) => <Badge key={m} tone="warn">{m}</Badge>)}</div></Section>}
        {spec.canvasRef && <Section title="Canvas"><code className="xs">{spec.canvasRef}</code></Section>}
      </div>
    </Drawer>
  );
}
