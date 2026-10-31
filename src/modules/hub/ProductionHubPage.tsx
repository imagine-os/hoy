import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import { useSession } from '../../auth/SessionProvider';
import { ROLE_HOME, ROLE_LABEL, type Role } from '../../auth/roles';
import { isViewableRole } from '../../auth/viewAs';
import { getRoutes } from '../../app/registry';
import { Card } from '../../components/molecule/Card/Card';
import { Button } from '../../components/atom/Button/Button';
import { HUB_EXPERIENCES, HUB_ROLES } from '../../hub/hubMap.data';

/**
 * HUB-01 in production (Hoy all-roles, lane D): the super admin's Hub. Two lists from the hub map data: every role the
 * super admin may view as, and the experiences production registers. "Ver como" sets view-as (read-only, src/auth/viewAs.ts)
 * and opens the role's home; the session then shows that role's screens with a sample person's data.
 * Nothing here is demo data: no personas, previews or toggles (those are the review build's HubPage).
 */
export function ProductionHubPage() {
  const { t, bi } = useI18n();
  const nav = useNavigate();
  const { setViewAs } = useSession();
  const registered = useMemo(() => new Set(getRoutes().map((r) => r.path)), []);
  const roles = useMemo(() => HUB_ROLES.filter((r) => isViewableRole(r.id)), []);
  const experiences = useMemo(() => HUB_EXPERIENCES.filter((e) => !e.comingSoon && registered.has(e.route)), [registered]);

  const viewAs = (role: Role, to: string) => { setViewAs(role); nav(to); };

  return (
    <div className="container page stack" data-production-hub>
      <header className="page-head">
        <div className="stack-sm">
          <h1>{t('hub.prod.title')}</h1>
          <p className="muted">{t('hub.prod.lead')}</p>
        </div>
      </header>

      <section className="stack" aria-labelledby="hub-prod-roles">
        <div className="stack-sm">
          <h2 id="hub-prod-roles">{t('hub.prod.roles')}</h2>
          <p className="muted small">{t('hub.prod.rolesBody')}</p>
        </div>
        <div className="grid grid-auto">
          {roles.map((r) => {
            const role = r.id as Role;
            return (
              <Card key={r.id} title={bi(r.label)} padding="md" data-hub-role={r.id}>
                <div className="stack-sm">
                  <p className="small">{bi(r.description)}</p>
                  <p className="muted small"><code>{t('hub.prod.home', { path: ROLE_HOME[role] })}</code></p>
                  <div><Button variant="secondary" icon="eye" data-view-as={r.id} onClick={() => viewAs(role, ROLE_HOME[role])}>{t('hub.prod.viewAs', { role: bi(ROLE_LABEL[role]) })}</Button></div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="stack" aria-labelledby="hub-prod-experiences">
        <div className="stack-sm">
          <h2 id="hub-prod-experiences">{t('hub.prod.experiences')}</h2>
          <p className="muted small">{t('hub.prod.experiencesBody')}</p>
        </div>
        <div className="grid grid-auto">
          {experiences.map((e) => {
            const owner = e.roleId as Role;
            const viewable = isViewableRole(owner);
            return (
              <Card key={e.id} title={bi(e.label)} eyebrow={bi(ROLE_LABEL[owner] ?? ROLE_LABEL.public)} padding="md" data-hub-experience={e.id}>
                <div className="stack-sm">
                  <p className="small">{bi(e.purpose)}</p>
                  <p className="muted small"><code>{e.route}</code></p>
                  <div>
                    {viewable
                      ? <Button variant="secondary" icon="eye" data-view-as-experience={e.id} onClick={() => viewAs(owner, e.route)}>{t('hub.prod.viewAs', { role: bi(ROLE_LABEL[owner]) })}</Button>
                      : <Button variant="secondary" data-open-experience={e.id} onClick={() => nav(e.route)}>{t('hub.prod.open')}</Button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
