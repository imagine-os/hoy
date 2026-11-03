import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nProvider';
import { useSession } from '../../../auth/SessionProvider';
import { ROLE_HOME } from '../../../auth/roles';
import { EmptyState } from '../../molecule/EmptyState/EmptyState';
import { Button } from '../../atom/Button/Button';

/**
 * A page whose code could not be downloaded (a lazy chunk, or its CSS; e.g. after a deploy). `lazyPages` keeps the
 * rejected import, so rendering again cannot recover: only a reload can.
 */
export function isChunkLoadError(error: unknown): boolean {
  if (!error || (typeof error !== 'object' && typeof error !== 'string')) return false;
  const text = typeof error === 'string' ? error : `${(error as { name?: unknown }).name ?? ''} ${(error as { message?: unknown }).message ?? ''}`;
  return /ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Loading chunk [\w-]+ failed/i.test(text);
}
/** What Retry does: reload the page after a failed download, else render the page again. */
export const retryKind = (error: unknown): 'reload' | 'remount' => (isChunkLoadError(error) ? 'reload' : 'remount');
/** What Home does: on the role's home itself a link would go nowhere, so it renders the page again; else it navigates. */
export const homeKind = (pathname: string, homeTo: string): 'remount' | 'navigate' => (pathname === homeTo ? 'remount' : 'navigate');

export interface RouteErrorCardProps {
  /** Renders the page again (or reloads it, when its code failed to download). */
  onRetry: () => void;
  /** Where Home goes (the signed-in role's home). */
  homeTo: string;
  /** Called on Home; when the crashed page is the home itself, it renders the page again instead of navigating. */
  onHome?: (event: { preventDefault: () => void }) => void;
}

/** The card a crashed page shows in place of its content: what happened, Retry and Home. */
export function RouteErrorCard({ onRetry, homeTo, onHome }: RouteErrorCardProps) {
  const { t } = useI18n();
  return (
    <div className="stack" data-route-error>
      <EmptyState tone="error" title={t('core.routeError.title')} body={t('core.routeError.body')}
        action={<div className="row wrap"><Button onClick={onRetry}>{t('core.common.retry')}</Button><Link to={homeTo} onClick={onHome}><Button variant="secondary">{t('core.routeError.home')}</Button></Link></div>} />
    </div>
  );
}

interface BoundaryProps { children: ReactNode; resetKey: string; fallback: (error: unknown, remount: () => void) => ReactNode }
interface BoundaryState { failed: boolean; error: unknown }
/**
 * The boundary itself. It is never keyed by the path: React Router keeps one page instance across that page's routes
 * (`/app/booking/:id` and its `/change` sheet, the Settings tabs, the schedule's day and week), and a key would remount
 * it on every path change and drop its state. Only a failed boundary starts clean when `resetKey` (the path) changes.
 */
export class RouteBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false, error: null };
  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> { return { failed: true, error }; }
  override componentDidCatch(error: unknown, info: ErrorInfo) { console.error('[route] the page crashed:', error, info.componentStack); }
  override componentDidUpdate(prevProps: BoundaryProps, prevState: BoundaryState) {
    // Reset only a failure that was already on screen before the path changed. A page that throws in the very render
    // that changed the path keeps its card (prevState.failed is false then), so it is not retried in a loop.
    if (prevState.failed && this.state.failed && prevProps.resetKey !== this.props.resetKey) this.setState({ failed: false, error: null });
  }
  /** Retry and Home on the home: the crashed page's tree was unmounted, so clearing the failure mounts it afresh. */
  private remount = () => this.setState({ failed: false, error: null });
  override render() { return this.state.failed ? this.props.fallback(this.state.error, this.remount) : this.props.children; }
}

/** The boundary for one path (hook-free, so it can be checked on its own): `resetKey` is the path, never the key. */
export function routeBoundaryElement(pathname: string, homeTo: string, children: ReactNode) {
  return <RouteBoundary resetKey={pathname} fallback={(error, remount) => (
    <RouteErrorCard homeTo={homeTo}
      onRetry={() => { if (retryKind(error) === 'reload') window.location.reload(); else remount(); }}
      onHome={(event) => { if (homeKind(pathname, homeTo) === 'remount') { event.preventDefault(); remount(); } }} />
  )}>
    {/* The page loads under its own Suspense, inside the boundary: a page still downloading keeps the shell on screen, and
        one whose download fails is caught here (the app-level Suspense alone let that error escape every boundary). */}
    <Suspense fallback={<div className="lazy-fallback" aria-busy="true" />}>{children}</Suspense>
  </RouteBoundary>;
}

/**
 * The route-level error boundary (`withShell`, src/app/shells.tsx): it sits inside the shell, so a page that throws
 * shows `RouteErrorCard` while the menu and the top bar keep working. A working page stays mounted across path changes;
 * after a crash, opening another page (a new path) starts clean. Retry renders the page again, or reloads after a failed
 * download; Home on the home itself renders it again.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { role } = useSession();
  return routeBoundaryElement(pathname, ROLE_HOME[role] ?? '/', children);
}
