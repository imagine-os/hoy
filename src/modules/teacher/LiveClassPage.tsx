import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {Link,useParams} from 'react-router-dom';
import {useSession} from '../../auth/SessionProvider';
import {onViewAsChange,viewAsActive,viewAsPersonId} from '../../auth/viewAs';
import {useData} from '../../data/DataContext';
import {useI18n} from '../../i18n/I18nProvider';
import {formatDate,formatTime} from '../../i18n/format';
import {Card} from '../../components/molecule/Card/Card';
import {Button} from '../../components/atom/Button/Button';
import {Badge} from '../../components/atom/Badge/Badge';
import {EmptyState} from '../../components/molecule/EmptyState/EmptyState';
import {readLiveTeacherRoster} from './liveRoster';
const viewSnapshot=()=>`${viewAsActive()}:${viewAsPersonId()??''}`;
/** Read-only production view. Context changes synchronously conceal the previous roster. */
export function LiveTeacherClassPage(){
 const data=useData(),{user,role}=useSession(),{id=''}=useParams(),{t,lang}=useI18n();
 const view=useSyncExternalStore(onViewAsChange,viewSnapshot,viewSnapshot),key=`${user.id}|${role}|${id}|${view}`;
 const current=useRef({data,key});current.current={data,key};
 type Result=Awaited<ReturnType<typeof readLiveTeacherRoster>>;
 const [reload,setReload]=useState(0),[state,setState]=useState<{data:typeof data;key:string;status:'ready'|'loading'|'error';value?:Result}>();
 useEffect(()=>{let alive=true,epoch=0;const load=async()=>{const n=++epoch;const valid=()=>alive&&current.current.data===data&&current.current.key===key&&n===epoch;setState({data,key,status:'loading'});try{const value=await readLiveTeacherRoster(data,{userId:user.id,role,name:user.name},id,valid);if(valid())setState({data,key,status:'ready',value});}catch{if(valid())setState({data,key,status:'error'});}};void load();const off=data.subscribe('*',e=>{if(['teachers','class_sessions','bookings','profiles'].includes(e.table))void load();});const timer=setInterval(()=>void load(),20000);return()=>{alive=false;epoch++;off();clearInterval(timer);};},[data,key,reload]);
 const shown=state?.data===data&&state.key===key?state:undefined;
 if(shown?.status!=='ready'||!shown.value)return <div className="container page stack teach"><Link to="/teach">{t('core.nav.back')}</Link><EmptyState tone={shown?.status==='error'?'error':'loading'} title={t(shown?.status==='error'?'teacher.access.unavailable':'core.common.loading')} action={shown?.status==='error'?<Button onClick={()=>setReload(n=>n+1)}>{t('teacher.access.retry')}</Button>:undefined}/></div>;
 const {session,people}=shown.value;
 return <div className="container page stack teach"><Link to="/teach">{t('core.nav.back')}</Link><Card title={session.title}><p>{formatDate(session.starts_at,lang,{weekday:'long',day:'numeric',month:'long'})} · {formatTime(session.starts_at,lang)}–{formatTime(session.ends_at,lang)}</p></Card><Card title={t('teacher.class.roster')}><p className="small">{t('teacher.class.checkin.body')}</p>{people.length?<ul className="stack-sm">{people.map(p=><li key={p.id} className="row-between"><span>{p.name||t('teacher.home.roster.unknown')}</span>{p.arrived&&<Badge tone="success">{t('teacher.home.roster.arrived')}</Badge>}</li>)}</ul>:<EmptyState compact title={t('teacher.class.emptyRoster')}/>}</Card></div>;
}
