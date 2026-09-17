import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Card } from '../../../components/molecule/Card/Card';
import { Badge } from '../../../components/atom/Badge/Badge';
import { Button } from '../../../components/atom/Button/Button';
import { Drawer } from '../../../components/organism/Drawer/Drawer';
import { ListGroup, ListRow } from '../../../components/molecule/ListRow/ListRow';
import { rulesArticles, type Article } from '../content';
import { useLocalPref } from '../hooks';
import { MediaPlaceholder, PageHead } from '../ui';

/** C-13 Club rules & best practices — the content library that keeps the room safe and pleasant. */
export function RulesPage() {
  const { t, bi } = useI18n();
  const [open, setOpen] = useState<Article | null>(null);
  const [read, setRead] = useLocalPref<string[]>('rules.read', []);
  const tour = rulesArticles.find((a) => a.slug === 'tour')!;
  const markRead = (a: Article) => { if (!read.includes(a.slug)) setRead((r) => [...r, a.slug]); setOpen(null); };

  return (
    <div className="container page cust-page">
      <PageHead back="/app/more" title={t('customer.rules.title')} sub={t('customer.rules.sub')} />
      <div className="stack">
        <button type="button" className="cust-plainbtn" onClick={() => setOpen(tour)}>
          <MediaPlaceholder label={bi(tour.video!)}><span className="cust-play" aria-hidden>▶</span></MediaPlaceholder>
        </button>
        <ListGroup>
          {rulesArticles.map((a) => <ListRow key={a.slug} icon={a.icon} title={bi(a.title)} subtitle={bi(a.summary)} trailing={read.includes(a.slug) ? <Badge tone="success">{t('customer.rules.read')}</Badge> : a.locked ? <Badge tone="danger">{t('customer.rules.required')}</Badge> : undefined} onClick={() => setOpen(a)} />)}
        </ListGroup>
        <p className="xs muted" style={{ textAlign: 'center' }}>{t('customer.rules.note')}</p>
      </div>
      <Drawer open={!!open} onClose={() => setOpen(null)} side="bottom" title={open ? bi(open.title) : ''} footer={open ? <Button onClick={() => markRead(open)}>{t('customer.rules.gotIt')}</Button> : undefined}>
        {open && (
          <div className="stack">
            {open.video && <MediaPlaceholder label={bi(open.video)}><span className="cust-play" aria-hidden>▶</span></MediaPlaceholder>}
            {open.body.map((p, i) => <p key={i} className="small">{bi(p)}</p>)}
            {open.checklist && <Card tone="muted" eyebrow={t('customer.rules.checklist')}><ul className="cust-checklist small">{open.checklist.map((c, i) => <li key={i}>{bi(c)}</li>)}</ul></Card>}
          </div>
        )}
      </Drawer>
    </div>
  );
}
