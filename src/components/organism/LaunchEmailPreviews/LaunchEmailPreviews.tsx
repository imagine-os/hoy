import {useState} from 'react';
import {useI18n} from '../../../i18n/I18nProvider';
import {Button} from '../../atom/Button/Button';
import {Input, Select} from '../../atom/Input/Input';
import {Notice} from '../../molecule/Notice/Notice';
import {EmailPreview} from '../EmailPreview/EmailPreview';
import {LAUNCH_EMAIL_EVENTS, adjacentLaunchEvent, filterLaunchEvents, renderLaunchPreview, type LaunchEmailEvent, type PreviewLocale} from '../../../modules/email-previews/catalog';
import './LaunchEmailPreviews.css';

/** Read-only rehearsal. No provider, session, storage, timer, dispatch or live-template dependency. */
export function LaunchEmailPreviews({events = LAUNCH_EMAIL_EVENTS}: {events?: readonly LaunchEmailEvent[]}) {
 const {t,lang} = useI18n();
 const [open,setOpen]=useState(false), [query,setQuery]=useState(''), [selected,setSelected]=useState(events[0]?.id??'');
 const [locale,setLocale]=useState<PreviewLocale>(lang), [scenario,setScenario]=useState<'ready'|'empty'|'error'>('ready');
 const shown=filterLaunchEvents(events,query,lang), event=shown.find(e=>e.id===selected)??shown[0];
 const result=renderLaunchPreview(event,locale,scenario), position=event?shown.indexOf(event):-1;
 const reset=()=>{setQuery('');setSelected(events[0]?.id??'');setScenario('ready');};
 return <section className="launch-email-previews stack-sm" aria-label={t('launchEmails.title')}>
  <Button variant="secondary" aria-expanded={open} onClick={()=>setOpen(!open)}>{t('launchEmails.title')}</Button>
  {open&&<div className="stack">
   <Notice>{t('launchEmails.notice')}</Notice>
   <div className="launch-email-controls">
    <label className="stack-sm">{t('launchEmails.search')}<Input value={query} onChange={e=>{setQuery(e.target.value);setScenario('ready');}} /></label>
    <label className="stack-sm">{t('launchEmails.event')}<Select aria-label={t('launchEmails.event')} value={event?.id??''} disabled={!shown.length} onChange={e=>{setSelected(e.target.value);setScenario('ready');}}>{shown.map(e=><option key={e.id} value={e.id}>{e.name[lang]}</option>)}</Select></label>
    <label className="stack-sm">{t('launchEmails.language')}<Select aria-label={t('launchEmails.language')} value={locale} onChange={e=>setLocale(e.target.value as PreviewLocale)}><option value="es">Español</option><option value="en">English</option></Select></label>
    <label className="stack-sm">{t('launchEmails.scenario')}<Select aria-label={t('launchEmails.scenario')} value={scenario} onChange={e=>setScenario(e.target.value as typeof scenario)}>{(['ready','empty','error'] as const).map(s=><option value={s} key={s}>{t(`launchEmails.${s}`)}</option>)}</Select></label>
   </div>
   <nav className="row wrap" aria-label={t('launchEmails.navigation')}>
    <Button variant="outline" disabled={position<=0} onClick={()=>{setSelected(adjacentLaunchEvent(shown,event?.id??'',-1)??'');setScenario('ready');}}>{t('launchEmails.previous')}</Button>
    <span className="small" aria-live="polite">{position+1} / {shown.length}</span>
    <Button variant="outline" disabled={position<0||position===shown.length-1} onClick={()=>{setSelected(adjacentLaunchEvent(shown,event?.id??'',1)??'');setScenario('ready');}}>{t('launchEmails.next')}</Button>
    <Button variant="ghost" onClick={reset}>{t('launchEmails.reset')}</Button>
   </nav>
   {!shown.length?<Notice>{query.trim()?t('launchEmails.noMatch'):t('launchEmails.emptyBody')}</Notice>:<>
    <div className="stack-sm"><h2>{event.name[lang]}</h2><p><strong>{t('launchEmails.trigger')}: </strong>{event.when[lang]}</p><Notice tone="warn" title={t('launchEmails.gap')}>{event.gap[lang]}</Notice></div>
    {result.status==='ready'?<div lang={locale}><EmailPreview subject={result.subject} body={result.body} footer={t('launchEmails.footer')} /></div>:<Notice tone={result.status==='error'?'danger':'info'} action={<Button variant="outline" onClick={()=>setScenario('ready')}>{t('launchEmails.retry')}</Button>}>{t(`launchEmails.${result.status}Body`)}</Notice>}
   </>}
  </div>}
 </section>;
}
