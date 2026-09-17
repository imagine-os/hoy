import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { FAMILY_LABEL, pricing, type PlanFamily } from '../../../tenant/pricing';
import { tenant } from '../../../tenant/tenant';
import { Card } from '../../../components/molecule/Card/Card';
import { PriceRow } from '../../../components/molecule/PriceRow/PriceRow';
import { PageHead, SiteShell } from '../SiteShell';

const ORDER: PlanFamily[] = ['bienvenida', 'membresia', 'pausas', 'regalos', 'espacio'];

/** P-01 — reads only src/tenant/pricing.ts. */
export function PlansPage() {
  const { t, bi, lang } = useI18n();
  const nav = useNavigate();
  const { switchUser } = useSession();
  const buy = (id: string) => { switchUser('customer'); nav(`/app/plans?plan=${id}`); };
  return (
    <SiteShell>
      <PageHead title={t('site.plans.title')} body={lang === 'es' ? `Modelo de Valor v3 · precios en COP · ${tenant.studio.mats} mats, ${tenant.studio.classesPerDay} clases al día.` : `Value model v3 · prices in COP · ${tenant.studio.mats} mats, ${tenant.studio.classesPerDay} classes a day.`} />
      <section className="container site-section" style={{ paddingTop: 0 }}>
        <div className="grid grid-2">
          {ORDER.map((fam) => (
            <Card key={fam} title={bi(FAMILY_LABEL[fam])} tone={fam === 'membresia' ? 'highlight' : 'surface'}>
              {pricing.filter((p) => p.family === fam).map((p) => <PriceRow key={p.id} item={p} onSelect={fam === 'espacio' ? undefined : () => buy(p.id)} />)}
            </Card>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
