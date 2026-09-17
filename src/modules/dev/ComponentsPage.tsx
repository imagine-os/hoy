import { Fragment, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { componentLibrary, TIER_ORDER } from '../../design/library';
import type { Tier } from '../../design/meta';
import { Card } from '../../components/molecule/Card/Card';
import { Chip } from '../../components/atom/Chip/Chip';
import { Badge } from '../../components/atom/Badge/Badge';
import './dev.css';

/** D-02 — renders every ComponentMeta with its usages. */
export function ComponentsPage() {
  const { t, bi } = useI18n();
  const [tier, setTier] = useState<Tier | 'all'>('all');
  const list = componentLibrary.filter((m) => tier === 'all' || m.tier === tier);
  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('dev.components.title')}</h1><p className="muted small">{t('dev.components.body')}</p></div><Badge>{t('dev.components.count', { n: componentLibrary.length })}</Badge></div>
      <div className="row wrap">
        <Chip selected={tier === 'all'} onClick={() => setTier('all')}>{t('core.common.all')}</Chip>
        {TIER_ORDER.map((tr) => <Chip key={tr} selected={tier === tr} onClick={() => setTier(tr)}>{tr} · {componentLibrary.filter((m) => m.tier === tr).length}</Chip>)}
      </div>
      <nav className="lib-toc small" aria-label="Components">{list.map((m) => <a key={m.name} href={`#cmp-${m.name}`}>{m.name}</a>)}</nav>
      {TIER_ORDER.filter((tr) => list.some((m) => m.tier === tr)).map((tr) => (
        <Fragment key={tr}>
          <h2 className="lib-tier">{tr}</h2>
          {list.filter((m) => m.tier === tr).map((m) => (
            <Card key={m.name} id={`cmp-${m.name}`} className="lib-card" padding="lg">
              <div className="lib-head">
                <div className="grow"><h3 className="lib-name">{m.name}</h3><p className="muted small">{bi(m.description)}</p></div>
                <div className="row wrap">{m.usedBy?.map((u) => <Badge key={u}>{u}</Badge>)}</div>
              </div>
              <div className="lib-usages">
                {m.usages.map((u, i) => <div key={i} className="lib-usage"><div className="eyebrow">{bi(u.title)}</div><div className="lib-canvas">{u.render()}</div></div>)}
              </div>
              <div className="lib-meta">
                <div><div className="eyebrow">{t('dev.components.states')}</div><div className="row wrap" style={{ marginTop: 6 }}>{m.states.map((s) => <Chip key={s}>{s}</Chip>)}</div></div>
                <div><div className="eyebrow">{t('dev.components.props')}</div><table className="lib-props"><tbody>{m.props.map((p) => <tr key={p.name}><td><code>{p.name}{p.required ? '*' : ''}</code></td><td className="muted xs"><code>{p.type}</code>{p.default ? ` = ${p.default}` : ''}</td><td className="small">{bi(p.description)}</td></tr>)}</tbody></table></div>
                <div><div className="eyebrow">{t('dev.components.a11y')}</div><ul className="small" style={{ margin: '6px 0 0', paddingLeft: '1.2em' }}>{m.a11y.map((a, i) => <li key={i}>{bi(a)}</li>)}</ul></div>
              </div>
            </Card>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
