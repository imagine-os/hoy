import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { ROLE_HOME } from '../../../auth/roles';
import { EmptyState } from '../../molecule/EmptyState/EmptyState';
import { Button } from '../../atom/Button/Button';

export interface RouteErrorCardProps {
  /** Renders the page again. */
  onRetry: () => void;
  /** Where Home goes (the signed-in role's home). */
  homeTo: string;
}

/** The card a crashed page shows in place of its content: what happened, Retry and Home. */
export function RouteErrorCard({ onRetry, homeTo }: RouteErrorCardProps) {
  const { t } = useI18n();
  return (
    <div className="stack" data-route-error>
      <EmptyState tone="error" title={t('core.routeError.title')} body={t('core.routeError.body')}
        action={<div className="row wrap"><Button onClick={onRetry}>{t('core.common.retry')}</Button><Link to={homeTo}><Button variant="secondary">{t('core.routeError.home')}</Button></Link></div>} />
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode; fallback: (retry: () => void) => ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: unknown, info: ErrorInfo) { console.error('[route] the page crashed:', error, info.componentStack); }
  private retry = () => this.setState({ failed: false });
  override render() { return this.state.failed ? this.props.fallback(this.retry) : this.props.children; }
}

/**
 * The route-level error boundary (`withShell`, src/app/shells.tsx): it sits inside the shell, so a page that throws
 * shows `RouteErrorCard` while the menu and the top bar keep working. Opening another page (a new path) starts clean.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { role } = useSession();
  return <Boundary key={pathname} fallback={(retry) => <RouteErrorCard onRetry={retry} homeTo={ROLE_HOME[role] ?? '/'} />}>{children}</Boundary>;
}
