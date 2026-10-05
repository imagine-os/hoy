import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { DataProviderRoot, useData } from '../../../data/DataContext';
import { archiveProvider } from './data';
import { HomePage } from './HomePage';
import { AboutPage } from './AboutPage';
import { ClassesPage } from './ClassesPage';
import { ClassDetailPage } from './ClassDetailPage';
import { TeachersPage } from './TeachersPage';
import { ModalitiesPage } from './ModalitiesPage';
import { PlansPage } from './PlansPage';
import './archive.css';

export function ArchivePage() {
  const current = useData();
  const provider = useMemo(() => archiveProvider(current), [current]);
  const { pathname } = useLocation();
  const path = pathname.replace(/\/$/, '') || '/site';
  const Page = path.startsWith('/site/classes/') ? ClassDetailPage : ({ '/site/about': AboutPage, '/site/classes': ClassesPage, '/site/teachers': TeachersPage, '/site/modalities': ModalitiesPage, '/site/plans': PlansPage }[path] ?? HomePage);
  return <DataProviderRoot provider={provider}><Page /></DataProviderRoot>;
}
