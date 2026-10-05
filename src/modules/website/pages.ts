import { createElement, lazy, type ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSiteEdition, archiveSupports } from './edition';
const ArchivePage = lazy(() => import('./archive/ArchivePage').then(m => ({ default: m.ArchivePage })));
function withEdition<P extends object>(Page: ComponentType<P>): ComponentType<P> {
  return function EditionPage(props: P) {
    const { archived } = useSiteEdition();
    const { pathname, search } = useLocation();
    if (archived && !archiveSupports(pathname)) {
      const params = new URLSearchParams(search); params.set('version', 'latest');
      return createElement(Navigate, { to: { pathname, search: params.toString() }, replace: true });
    }
    return archived ? createElement(ArchivePage, { key: 'archive' }) : createElement(Page, { ...props, key: 'latest' });
  };
}
import { HomePage as CurrentHomePage } from './pages/HomePage';
export const HomePage = withEdition(CurrentHomePage);
import { AboutPage as CurrentAboutPage } from './pages/AboutPage';
export const AboutPage = withEdition(CurrentAboutPage);
import { ClassesPage as CurrentClassesPage } from './pages/ClassesPage';
export const ClassesPage = withEdition(CurrentClassesPage);
import { ClassDetailPage as CurrentClassDetailPage } from './pages/ClassDetailPage';
export const ClassDetailPage = withEdition(CurrentClassDetailPage);
import { ModalitiesPage as CurrentModalitiesPage } from './pages/ModalitiesPage';
export const ModalitiesPage = withEdition(CurrentModalitiesPage);
import { SchedulePage as CurrentSchedulePage } from './pages/SchedulePage';
export const SchedulePage = withEdition(CurrentSchedulePage);
import { TeachersPage as CurrentTeachersPage } from './pages/TeachersPage';
export const TeachersPage = withEdition(CurrentTeachersPage);
import { PlansPage as CurrentPlansPage } from './pages/PlansPage';
export const PlansPage = withEdition(CurrentPlansPage);
import { FaqPage as CurrentFaqPage } from './pages/FaqPage';
export const FaqPage = withEdition(CurrentFaqPage);
import { ContactPage as CurrentContactPage } from './pages/ContactPage';
export const ContactPage = withEdition(CurrentContactPage);
import { LegalPage as CurrentLegalPage } from './pages/LegalPage';
export const LegalPage = withEdition(CurrentLegalPage);
import { DeleteAccountPage as CurrentDeleteAccountPage } from './pages/DeleteAccountPage';
export const DeleteAccountPage = withEdition(CurrentDeleteAccountPage);
