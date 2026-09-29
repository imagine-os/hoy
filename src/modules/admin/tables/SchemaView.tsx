import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { tableRegistry, type ColumnDef } from '../../../data/schema';
import { columnLabel, enumLabel, tableLabel } from '../../../data/labels';
import { neighborsOf } from '../../../data/relations';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Icon } from '../../../components/atom/Icon/Icon';
import { Card } from '../../../components/molecule/Card/Card';
import { allowedColumns, type Def } from './model';

/** Esquema: every column with its human name, type in words, options and reference; then the relations in and out. */
export function SchemaView({ def, canWrite }: { def: Def; canWrite: boolean }) {
  const { t, lang } = useI18n();
  const cols = allowedColumns(def, canWrite);
  const rel = neighborsOf(def.name, lang);
  const type = (c: ColumnDef) => (c.references ? t('admin.tables.type.reference') : c.enum ? t('admin.tables.type.enum') : t(`admin.tables.type.${c.type}`));
  return (
    <div className="stack">
      <Card padding="none" className="tbl-schema">
        <ul className="tbl-schema-list">
          {cols.map((c) => (
            <li key={c.name} className="tbl-schema-row">
              <div className="tbl-schema-name">
                <span className="tbl-schema-label">{columnLabel(def, c, lang)}</span>
                <code className="tbl-tech">{c.name}</code>
              </div>
              <div className="row wrap tbl-schema-meta">
                <Badge tone="primary">{type(c)}</Badge>
                {c.nullable && <Badge>{t('admin.tables.optional')}</Badge>}
                {c.sensitive && <Badge tone="warn">{t('admin.tables.sensitive')}</Badge>}
                {c.references && <Link className="tbl-ref" to={`/admin/tables/${c.references}`}><Icon name={tableRegistry[c.references]?.icon ?? 'link'} size="xs" /><span className="tbl-ref-text">{tableLabel(c.references, lang)}</span></Link>}
                {c.enum && <span className="small muted">{c.enum.map((o) => enumLabel(o, lang)).join(' · ')}</span>}
              </div>
              {c.description && <p className="xs muted tbl-schema-desc">{c.description}</p>}
            </li>
          ))}
        </ul>
      </Card>
      <Card title={t('admin.tables.schema.relations')} padding="md">
        {rel.length === 0 ? <p className="small muted">{t('admin.tables.related.none')}</p> : (
          <ul className="tbl-rel-list">
            {rel.map((r) => (
              <li key={`${r.direction}-${r.from}-${r.column}`} className="tbl-rel">
                <Icon name={r.direction === 'out' ? 'arrow-right' : 'arrow-left'} size="sm" />
                <span className="small muted">{r.direction === 'out' ? t('admin.tables.schema.pointsTo') : t('admin.tables.schema.pointedBy')}</span>
                <Link className="tbl-ref" to={`/admin/tables/${r.table}`}><Icon name={tableRegistry[r.table]?.icon ?? 'table'} size="xs" /><span className="tbl-ref-text">{tableLabel(r.table, lang)}</span></Link>
                <span className="small">{r.label}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
