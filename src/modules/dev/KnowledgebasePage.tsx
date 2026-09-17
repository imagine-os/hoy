import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { docs, assetUrl } from '../docs/docsIndex';
import { MarkdownViewer } from '../../components/organism/MarkdownViewer/MarkdownViewer';
import { Chip } from '../../components/atom/Chip/Chip';
import { Card } from '../../components/molecule/Card/Card';
import { Badge } from '../../components/atom/Badge/Badge';

/** K-01 — kanban + changelog + prompt log, straight from docs/. */
export function KnowledgebasePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<'kanban' | 'changelog' | 'prompts'>('kanban');
  const kanban = docs.find((d) => d.path === 'docs/kanban.md');
  const changelog = docs.filter((d) => d.path.startsWith('docs/changelog/')).reverse();
  const prompts = docs.filter((d) => d.path.startsWith('docs/prompts/')).reverse();
  const toRoute = (p: string) => (p.startsWith('docs/') ? `/docs/${p.slice(5).replace(/\.md$/, '')}` : undefined);
  return (
    <div className="stack">
      <div className="page-head"><h1>{t('dev.kb.title')}</h1>
        <div className="row"><Chip selected={tab === 'kanban'} onClick={() => setTab('kanban')}>{t('dev.kb.kanban')}</Chip><Chip selected={tab === 'changelog'} onClick={() => setTab('changelog')}>{t('dev.kb.changelog')} · {changelog.length}</Chip><Chip selected={tab === 'prompts'} onClick={() => setTab('prompts')}>{t('dev.kb.prompts')} · {prompts.length}</Chip></div></div>
      {tab === 'kanban' && kanban && <Card><MarkdownViewer source={kanban.source} path={kanban.path} resolveAsset={assetUrl} resolveLink={toRoute} /></Card>}
      {tab === 'changelog' && changelog.map((d) => {
        const meta = Object.fromEntries([...d.source.matchAll(/^(\w+):\s*(.+)$/gm)].map((m) => [m[1], m[2]]));
        return <Card key={d.path} title={<span className="row wrap"><code className="xs">{d.path.split('/').pop()}</code>{meta.version && <Badge tone="primary">v{meta.version}</Badge>}{meta.date && <Badge>{meta.date}</Badge>}</span>}><MarkdownViewer source={d.source.replace(/^(\w+):\s*(.+)$/gm, '**$1:** $2  ')} path={d.path} resolveAsset={assetUrl} resolveLink={toRoute} /></Card>;
      })}
      {tab === 'prompts' && prompts.map((d) => <Card key={d.path} title={d.title}><MarkdownViewer source={d.source} path={d.path} resolveAsset={assetUrl} resolveLink={toRoute} /></Card>)}
    </div>
  );
}
