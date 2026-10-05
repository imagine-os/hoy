import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { tenant } from '../../../tenant/tenant';
import { taglines } from '../../../tenant/brand';
import { Wordmark } from '../../atom/Wordmark/Wordmark';
import { Icon } from '../../atom/Icon/Icon';
import { LangToggle } from '../../molecule/LangToggle/LangToggle';
import { AmbientScene } from '../../organism/AmbientScene/AmbientScene';
import './ComingSoonLanding.css';

/** An independent launch surface: no website-edition state or mock conversion controls. */
export function ComingSoonLanding() {
  const { t, bi } = useI18n();
  const [motion, setMotion] = useState(true);
  return <main className="coming-soon">
    <AmbientScene
      className="coming-soon-scene" priority motion={motion}
      poster={`${import.meta.env.BASE_URL}images/sanctuary/hero-sanctuary.webp`}
      video={`${import.meta.env.BASE_URL}video/living-hero-sanctuary.mp4`}
      alt={t('soon.art')}
    />
    <div className="coming-soon-veil" aria-hidden="true" />
    <div className="coming-soon-layout">
      <header className="coming-soon-header">
        <div className="coming-soon-brand"><Wordmark vector tone="cream" /><span>{bi(tenant.tagline)}</span></div>
        <div className="coming-soon-tools"><LangToggle /><Link className="coming-soon-login" to="/auth/sign-in">{t('soon.login')}</Link></div>
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
        <button type="button" className="coming-soon-motion" onClick={() => setMotion(value => !value)} aria-pressed={!motion}>
          <span aria-hidden="true">{motion ? 'Ⅱ' : '▷'}</span>{t(motion ? 'soon.pause' : 'soon.play')}
        </button>
      </footer>
    </div>
  </main>;
}
