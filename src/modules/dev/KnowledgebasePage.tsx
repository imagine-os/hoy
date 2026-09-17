import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { docs, useDocSource } from '../docs/docsIndex';
import { ChangelogEntry, KanbanBoard, PromptEntry } from '../docs/views';
import { Chip } from '../../components/atom/Chip/Chip';
import { Card } from '../../components/molecule/Card/Card';

/** K-01 — kanban + changelog + prompt log, straight from docs/ (same renderers as /docs). */
export function KnowledgebasePage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<'kanban' | 'changelog' | 'prompts'>('kanban');
  const kanban = useDocSource('docs/kanban.md');
  const changelog = docs.filter((d) => /^docs\/changelog\/\d{4}-/.test(d.path)).sort((a, b) => b.path.localeCompare(a.path));
  const prompts = docs.filter((d) => /^docs\/prompts\/\d{4}-/.test(d.path)).sort((a, b) => b.path.localeCompare(a.path));
  return (
    <div className="stack">
      <div className="page-head"><h1>{t('dev.kb.title')}</h1>
        <div className="row"><Chip selected={tab === 'kanban'} onClick={() => setTab('kanban')}>{t('dev.kb.kanban')}</Chip><Chip selected={tab === 'changelog'} onClick={() => setTab('changelog')}>{t('dev.kb.changelog')} · {changelog.length}</Chip><Chip selected={tab === 'prompts'} onClick={() => setTab('prompts')}>{t('dev.kb.prompts')} · {prompts.length}</Chip></div></div>
      {tab === 'kanban' && (kanban === undefined ? <p className="muted small">{t('core.common.loading')}</p> : <KanbanBoard source={kanban} />)}
      {tab === 'changelog' && changelog.map((d) => <ChangelogEntry key={d.path} doc={d} />)}
      {tab === 'prompts' && prompts.map((d) => <Card key={d.path} title={d.title}><PromptEntry doc={d} /></Card>)}
    </div>
  );
}
