import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useData, useTable } from '../../data/DataContext';
import type { ModalityRow } from '../../data/schema';
import { formatCOP } from '../../i18n/format';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { Input } from '../../components/atom/Input/Input';
import { Field } from '../../components/molecule/Field/Field';
import { Chip } from '../../components/atom/Chip/Chip';
import { Avatar } from '../../components/atom/Avatar/Avatar';
import { Badge } from '../../components/atom/Badge/Badge';
import { EmptyState } from '../../components/molecule/EmptyState/EmptyState';
import { TeacherCard } from '../../components/organism/TeacherCard/TeacherCard';
import { useAudit } from '../staff/audit';
import { useTeacherSelf } from './useTeacherSelf';
import './teacher.css';

/** /teach/profile — photo, bilingual bio and specialties. Saves go through the coordinator (audit). */
export function TeacherProfilePage() {
  const { t, lang, bi } = useI18n();
  const data = useData();
  const audit = useAudit('teacher_app');
  const { me } = useTeacherSelf();
  const { rows: modalities } = useTable<ModalityRow>('modalities', { where: { active: true } });
  const [draft, setDraft] = useState({ display_name: '', bioEs: '', bioEn: '', specialties: [] as string[] });
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (me) setDraft({ display_name: me.display_name, bioEs: me.bio?.es ?? '', bioEn: me.bio?.en ?? '', specialties: me.specialties ?? [] }); }, [me?.id]);
  if (!me) return <div className="container page stack teach"><EmptyState title={t('teacher.home.notLinked')} /></div>;

  const dirty = draft.display_name !== me.display_name || draft.bioEs !== (me.bio?.es ?? '') || draft.bioEn !== (me.bio?.en ?? '') || draft.specialties.join() !== (me.specialties ?? []).join();
  const save = async () => {
    const after = { display_name: draft.display_name.trim(), bio: { es: draft.bioEs.trim(), en: draft.bioEn.trim() || draft.bioEs.trim() }, specialties: draft.specialties };
    await data.update('teachers', me.id, after);
    await audit('teacher.profile.submit', 'teachers', me.id, { before: { display_name: me.display_name, bio: me.bio, specialties: me.specialties }, after, review: 'coordinator' });
    setSaved(true); setTimeout(() => setSaved(false), 2500);
  };
  const toggle = (id: string) => setDraft({ ...draft, specialties: draft.specialties.includes(id) ? draft.specialties.filter((x) => x !== id) : [...draft.specialties, id] });

  return (
    <div className="container page stack teach">
      <h1 className="teach-h1">{t('teacher.profile.title')}</h1>
      <Card>
        <div className="row">
          <Avatar name={me.display_name} src={me.photo_url} size={64} />
          <div className="grow"><Field label={t('teacher.profile.name')}>{(id) => <Input id={id} value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />}</Field></div>
        </div>
        <p className="xs muted" style={{ marginTop: 8 }}>{t('teacher.profile.photo')}</p>
      </Card>
      <Card title={t('teacher.profile.bio')}>
        <div className="stack-sm">
          <Field label="ES" required>{(id) => <textarea id={id} className="input" rows={3} value={draft.bioEs} onChange={(e) => setDraft({ ...draft, bioEs: e.target.value })} />}</Field>
          <Field label="EN" hint={t('teacher.profile.bio.en.hint')}>{(id) => <textarea id={id} className="input" rows={3} value={draft.bioEn} onChange={(e) => setDraft({ ...draft, bioEn: e.target.value })} />}</Field>
        </div>
      </Card>
      <Card title={t('teacher.profile.specialties')}>
        <div className="row wrap">{modalities.map((m) => <Chip key={m.id} movement={m.movement} dot selected={draft.specialties.includes(m.id)} onClick={() => toggle(m.id)}>{bi({ es: m.name_es, en: m.name_en })}</Chip>)}</div>
      </Card>
      <Card tone="muted" padding="sm" className="row-between wrap">
        <span className="small">{t('teacher.profile.rate')}</span>
        <span className="row"><strong>{formatCOP(me.rate_per_class ?? 0, lang)}</strong><Badge>{t('teacher.profile.rate.readonly')}</Badge></span>
      </Card>
      <div className="stack-sm">
        <div className="eyebrow">{t('teacher.profile.preview')}</div>
        <TeacherCard name={draft.display_name || me.display_name} bio={{ es: draft.bioEs, en: draft.bioEn || draft.bioEs }} photo={me.photo_url} rating={me.rating_avg} specialties={draft.specialties.map((id) => modalities.find((m) => m.id === id)).filter(Boolean).map((m) => ({ label: bi({ es: m!.name_es, en: m!.name_en }), movement: m!.movement }))} />
      </div>
      <div className="row-between wrap">
        <span className="xs muted">{saved ? t('teacher.profile.saved') : t('teacher.profile.review')}</span>
        <Button disabled={!dirty || !draft.bioEs.trim() || !draft.display_name.trim()} onClick={save}>{t('teacher.profile.submit')}</Button>
      </div>
    </div>
  );
}
