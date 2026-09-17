import { useI18n } from '../../i18n/I18nProvider';
import { useTheme } from '../../design/ThemeProvider';
import { brand, movements, motion, radii, semantic, spacing, type as typeTokens } from '../../design/tokens';
import { Card } from '../../components/molecule/Card/Card';
import { Toggle } from '../../components/atom/Toggle/Toggle';
import './dev.css';

/** D-01 — renders the token object live. */
export function TokensPage() {
  const { t } = useI18n();
  const { theme, toggleTheme, skin, toggleSkin } = useTheme();
  const sem = semantic[theme];
  return (
    <div className="stack">
      <div className="page-head"><div><h1>{t('dev.tokens.title')}</h1><p className="muted small">{t('dev.tokens.body')}</p></div>
        <div className="row"><Toggle checked={theme === 'dark'} onChange={toggleTheme} label={t('core.theme.dark')} /><Toggle checked={skin === 'wireframe'} onChange={toggleSkin} label={t('core.skin.wireframe')} /></div></div>

      <Card title={t('dev.tokens.brand')}><div className="tok-swatches">{Object.entries(brand).map(([k, v]) => <Swatch key={k} name={`brand-${k}`} value={v} />)}</div></Card>
      <Card title={t('dev.tokens.semantic', { theme })}><div className="tok-swatches">{Object.entries(sem).filter(([k]) => k.startsWith('color-')).map(([k, v]) => <Swatch key={k} name={k} value={v} live />)}</div></Card>
      <Card title={t('dev.tokens.movements')}><div className="tok-swatches">{Object.entries(movements).map(([k, m]) => <div key={k} className="tok-mv" style={{ background: m.bg, color: m.fg }}><span className="tok-dot" style={{ background: m.dot }} />{m.label}<code className="xs">{m.dot}</code></div>)}</div></Card>
      <Card title={t('dev.tokens.type')}>
        <div className="stack-sm">
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--fs-3xl)', fontWeight: 600 }}>Inter — Hoy es un buen día</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--fs-lg)' }}>DM Sans — Un club humano para volver al cuerpo. <em>Énfasis en itálica.</em></div>
          <div className="tok-grid">{Object.entries(typeTokens).filter(([k]) => k.startsWith('fs-')).map(([k, v]) => <div key={k} className="tok-row"><code>--{k}</code><span style={{ fontSize: `var(--${k})`, fontFamily: 'var(--font-heading)' }}>Aa</span><span className="xs muted">{v}</span></div>)}</div>
        </div>
      </Card>
      <div className="grid grid-2">
        <Card title={t('dev.tokens.spacing')}><div className="stack-sm">{Object.entries(spacing).map(([k, v]) => <div key={k} className="tok-row"><code>--{k}</code><span className="tok-bar" style={{ width: v }} /><span className="xs muted">{v}</span></div>)}</div></Card>
        <Card title={t('dev.tokens.radii')}><div className="row wrap">{Object.entries(radii).map(([k, v]) => <div key={k} className="tok-radius" style={{ borderRadius: v }}><code className="xs">{k}</code><span className="xs muted">{v}</span></div>)}</div></Card>
      </div>
      <div className="grid grid-2">
        <Card title={t('dev.tokens.shadows')}>
          <div className="row wrap">
            {[['shadow-highlight', 'inset highlight'], ['shadow-contact', 'contact'], ['shadow-soft', 'soft ambient'], ['shadow-card', 'card (3 layers)'], ['shadow-raised', 'raised']].map(([k, label]) => <div key={k} className="tok-shadow" style={{ boxShadow: `var(--${k})` }}><code className="xs">--{k}</code><span className="xs muted">{label}</span></div>)}
          </div>
        </Card>
        <Card title={t('dev.tokens.motion')}><div className="stack-sm">{Object.entries(motion).map(([k, v]) => <div key={k} className="tok-row"><code>--{k}</code><span className="xs muted">{v}</span></div>)}</div></Card>
      </div>
    </div>
  );
}

function Swatch({ name, value, live }: { name: string; value: string; live?: boolean }) {
  return (
    <div className="tok-swatch">
      <span className="tok-swatch-color" style={{ background: live ? `var(--${name})` : value }} />
      <code className="xs">--{name}</code>
      <span className="xs muted">{value}</span>
    </div>
  );
}
