import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { taglines } from '../../../tenant/brand';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { Icon } from '../../atom/Icon/Icon';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import './ComingSoonLanding.css';

/** An independent launch surface: no website-edition state or mock conversion controls. "Entrar" opens sign-in, which
 * also creates an account (owner, 30 Oct: replaces the "member login is coming soon" drawer). */
export function ComingSoonLanding() {
  const { t, bi } = useI18n();
  return <main className="coming-soon">
    <img
      className="coming-soon-scene"
      src={`${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-1600.webp`}
      srcSet={`${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-480.webp 480w, ${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-960.webp 960w, ${import.meta.env.BASE_URL}images/studio-2026/facility-red-studio-1600.webp 1600w`}
      sizes="(max-aspect-ratio: 3/2) 150vh, 100vw" width={1600} height={1067} loading="eager" fetchPriority="high" decoding="async"
      alt={t('soon.art')}
    />
    <div className="coming-soon-veil" aria-hidden="true" />
    <div className="coming-soon-layout">
      <header className="coming-soon-header">
        <div className="coming-soon-brand"><Wordmark vector tone="cream" /><span>{bi(tenant.tagline)}</span></div>
        <div className="coming-soon-tools"><LangToggle /><Link to="/auth/sign-in" className="coming-soon-login">{t('soon.login')}</Link></div>
      </header>
      <section className="coming-soon-message" aria-labelledby="coming-soon-title">
        <p className="coming-soon-status"><span aria-hidden="true" />{t('soon.status')}</p>
        <h1 id="coming-soon-title">{bi(taglines.present).split('.').filter(Boolean).map(line => <span key={line}>{line.trim()}.</span>)}</h1>
        <p className="coming-soon-intro">{t('soon.intro')}</p>
        <div className="coming-soon-cta">
          <a className="coming-soon-follow" href={tenant.social.instagramUrl} target="_blank" rel="noopener noreferrer">
            <span>{t('soon.follow')}</span><Icon name="arrow-right" size={18} />
          </a>
          <p>{t('soon.news')}</p>
        </div>
      </section>
      <footer className="coming-soon-footer">
        <p>{tenant.city}<span aria-hidden="true"> · </span>{bi(tenant.tagline)}</p>
      </footer>
    </div>
  </main>;
}
