import { useI18n } from '../../../i18n/I18nProvider';
import { Card } from '../../molecule/Card/Card';
import { Avatar } from '../../atom/Avatar/Avatar';
import { Chip } from '../../atom/Chip/Chip';
import type { Movement } from '../../../design/tokens';
import './TeacherCard.css';

export interface TeacherCardProps {
  name: string; bio: { es: string; en: string }; photo?: string | null; rating?: number | null;
  specialties: { label: string; movement: Movement }[];
  onClick?: () => void;
}

export function TeacherCard({ name, bio, photo, rating, specialties, onClick }: TeacherCardProps) {
  const { bi } = useI18n();
  return (
    <Card interactive={!!onClick} onClick={onClick} className="teachercard">
      <div className="row">
        <Avatar name={name} src={photo} size={56} />
        <div className="grow">
          <h3 className="teachercard-name">{name}</h3>
          {rating != null && <div className="small muted">★ {rating.toFixed(1)}</div>}
        </div>
      </div>
      <p className="small teachercard-bio">{bi(bio)}</p>
      <div className="row wrap">{specialties.map((s) => <Chip key={s.label} movement={s.movement} dot>{s.label}</Chip>)}</div>
    </Card>
  );
}
