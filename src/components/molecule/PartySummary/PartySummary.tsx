import type { ReactNode } from 'react';
import { Badge } from '../../atom/Badge/Badge';

/**
 * A group pass in a class roster (S-02): its title, how many of its places have a name, and the people in it as
 * children. `actions` holds the desk's "add a person" control while places are left.
 */
export function PartySummary({ title, namedLabel, full, children, actions }: { title: string; namedLabel: string; full: boolean; children?: ReactNode; actions?: ReactNode }) {
  return (
    <section className="stack-sm" data-party>
      <div className="row-between wrap">
        <strong className="small">{title}</strong>
        <Badge tone={full ? 'success' : 'warn'}>{namedLabel}</Badge>
      </div>
      {children}
      {actions}
    </section>
  );
}
