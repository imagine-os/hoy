import {useEffect,useMemo,useRef,useState} from 'react';
import {useSession} from '../../../auth/SessionProvider';
import {getRoutes} from '../../../app/registry';
import {placementTarget} from '../MediaLibrary/placementTarget';
import {Link} from 'react-router-dom';
import {useI18n} from '../../../i18n/I18nProvider';
import {useData} from '../../../data/DataContext';
import {useMediaLibrary} from '../../../data/useMediaLibrary';
import {safeMediaUrl} from '../../../data/mediaLibrary';
import {downscaledPhoto,importLocalPhoto,isLocalPhotoUrl} from '../../../data/localMediaStore';
import {tenant} from '../../../tenant/tenant';
import {imageFieldMode,prepareForUpload,reportImageBusy,uploadPublicImage,type ImageDraft,type ImageOwner,type ImagePort} from '../../../data/companyos/publicImages';
import {refusalCopy} from '../../../data/companyos/refusals';
import {Button} from '../../atom/Button/Button';
import {Input,Select} from '../../atom/Input/Input';
import './SharedImageField.css';
/**
 * `owner`: production's real upload (a Company OS file on this record; the value becomes `/media/<id>`), with `saved` the
 * value its record holds and `draft` this form's unsaved uploads. `onBusyChange`: the form's Save waits for an upload.
 * `needsSave`: the record doesn't exist yet. `ownerFailed`: it couldn't be read.
 */
export interface SharedImageFieldProps {value:string|null;onChange:(url:string|null)=>void;disabled?:boolean;label?:string;owner?:ImageOwner;saved?:string|null;draft?:ImageDraft;onBusyChange?:(busy:boolean)=>void;needsSave?:boolean;ownerFailed?:boolean}
const displayUrl=(url:string)=>/^(data:|https?:|\/)/.test(url)?url:`${import.meta.env.BASE_URL}${url.replace(/^\.\//,'')}`;
/**
 * A freshly published image may answer "not there yet" for a moment (`file_not_ready`): it is asked again a few times.
 * Then it says so in words: the public address only shows what the policy publishes (an inactive teacher's photo isn't),
 * so no preview here says nothing about what is saved.
 */
function Preview({src,alt,unavailable}:{src:string;alt:string;unavailable:string}){
 const [tries,setTries]=useState(0),[gaveUp,setGaveUp]=useState(false);useEffect(()=>{setTries(0);setGaveUp(false);},[src]);
 const media=src.startsWith('/media/');
 if(gaveUp)return <p className="muted small" data-preview="unavailable">{unavailable}</p>;
 return <img className="shared-image-preview" src={tries?`${src}?r=${tries}`:src} alt={alt} onError={()=>{if(!media)return;if(tries<3)window.setTimeout(()=>setTries(n=>n+1),1500);else setGaveUp(true);}}/>;
}
export function SharedImageField({value,onChange,disabled=false,label,owner,saved,draft,onBusyChange,needsSave=false,ownerFailed=false}:SharedImageFieldProps){
 const {hasRole}=useSession();const routes=useMemo(()=>getRoutes(),[]);
 const {t,dict,lang}=useI18n();const text=(k:string)=>t(`media.picker.${k}`);const data=useData();const {assets,localError}=useMediaLibrary();
 // Local photos (the device's own store) exist only with the review build's in-browser provider (H-10: name, not instanceof, so MockProvider stays out of production).
 const mode=imageFieldMode(data as unknown as ImagePort,owner),localMedia=mode==='local',shared=mode==='shared';
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[source,setSource]=useState('all'),[candidate,setCandidate]=useState<string|null>(null),[previous,setPrevious]=useState<string|null|undefined>(undefined),[busy,setBusy]=useState(false),[error,setError]=useState(''),[refusal,setRefusal]=useState('');
 const root=useRef<HTMLElement>(null);
 const closeChooser=()=>{setOpen(false);setCandidate(null);root.current?.querySelector<HTMLButtonElement>('button')?.focus();};
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 // The form closed: its unsaved uploads go (a save has already told the draft which one stays).
 useEffect(()=>()=>{void draft?.discard();},[draft]);
 useEffect(()=>reportImageBusy(shared,busy,onBusyChange),[shared,busy,onBusyChange]);
 // Once a save has gone through there is nothing to undo to: the old file is deleted.
 useEffect(()=>{if(shared)setPrevious(undefined);},[saved,shared]);
 const current=assets.find(a=>a.url===value||a.variants.includes(value||''));
 const shown=assets.filter(a=>a.kind!=='video'&&safeMediaUrl(a.url)&&(!isLocalPhotoUrl(a.url)||localMedia)&&(source==='all'||a.source===source)&&`${a.name} ${a.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
 const choose=(url:string|null)=>{if(url&&isLocalPhotoUrl(url)&&!localMedia)return;setPrevious(value);onChange(url);closeChooser();};
 /** Production: uploaded means chosen, so the form's own Save carries it; undo goes back to what the record holds. */
 const uploadShared=async(file:File)=>{const url=await uploadPublicImage(data as unknown as ImagePort,owner!,await prepareForUpload(owner!,file,downscaledPhoto));draft?.add(url,owner!);if(!alive.current){void draft?.discard();return;}void draft?.discard(url);setPrevious(saved??null);onChange(url);closeChooser();};
 const upload=async(file?:File)=>{if(!file||busy||disabled||mode==='none')return;setBusy(true);setError('');setRefusal('');try{if(shared)await uploadShared(file);else{const url=(await importLocalPhoto(file,tenant.id)).url;if(alive.current){setCandidate(url);setOpen(true);}}}catch(e){if(!alive.current)return;if(shared){setRefusal(String((e as {code?:unknown}).code||(e as Error).message||'file_upload_missing'));}else setError(['format','size','dimensions','storage'].includes((e as Error).message)?(e as Error).message:'storage');}finally{if(alive.current)setBusy(false);}};
 return <section ref={root} className="shared-image-field stack-sm" aria-label={label||text('title')}>
 <strong>{label||text('title')}</strong>
 {value&&safeMediaUrl(value)?<Preview src={displayUrl(value)} alt={current?.name||text('preview')} unavailable={text('previewUnavailable')}/>:<span className="muted">{text('none')}</span>}
 <div className="row wrap"><Button type="button" variant="outline" disabled={disabled||busy} onClick={()=>{setOpen(!open);setCandidate(null);}} aria-expanded={open}>{text(shared?'uploadShared':'browse')}</Button><Button type="button" variant="ghost" disabled={disabled||busy||!value} onClick={()=>choose(null)}>{text('remove')}</Button>{previous!==undefined&&<Button type="button" variant="ghost" disabled={disabled||busy} onClick={()=>{onChange(previous);setPrevious(undefined);void draft?.discard(previous);}}>{text('undo')}</Button>}</div>
 <p className="muted small">{text('draft')}</p>
 {current&&current.usages.length>0&&<details><summary>{text('uses')}</summary>{current.usages.map((u,i)=>{const target=placementTarget(u.path,routes,hasRole);const label=dict[`media.usage.${u.label}`]?t(`media.usage.${u.label}`):u.label;return target?<Link key={i} to={target.to}>{label} · {t(`media.library.${u.state}`)}{target.documented&&` · ${t('media.library.documentedPreview')}`}</Link>:<span key={i}>{label} · {t('media.library.unavailablePreview')}</span>;})}</details>}
 {open&&<div className="shared-image-chooser stack-sm" onKeyDown={e=>{if(e.key==='Escape'&&!busy){e.stopPropagation();closeChooser();}}}>
 {!shared&&<>
 <label>{text('search')}<Input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label>
 <label>{text('source')}<Select value={source} onChange={e=>setSource(e.target.value)}><option value="all">{text('all')}</option>{[...new Set(assets.map(a=>a.source))].map(s=><option key={s} value={s}>{t(`media.library.${s}`)}</option>)}</Select></label>
 <div className="shared-image-options">{shown.map(a=><button type="button" key={a.id} disabled={disabled||busy} className="shared-image-option" aria-pressed={candidate===a.url} onClick={()=>setCandidate(a.url)}><img loading="lazy" src={displayUrl(a.thumbnail||a.url)} alt=""/><span>{a.name}</span></button>)}</div>
 {!shown.length&&<p role="status">{text('empty')}</p>}
 </>}
 <label>{text(shared?'uploadShared':'upload')}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||busy||mode==='none'} onChange={e=>{const f=e.target.files?.[0];e.target.value='';void upload(f);}}/></label>
 <p className="muted small">{text(shared?'sharedHint':'privacy')}</p>{mode==='none'&&<p>{text(ownerFailed?'ownerFailed':needsSave?'saveFirst':'backend')}</p>}
 {candidate&&<Preview src={displayUrl(candidate)} alt={text('preview')} unavailable={text('previewUnavailable')}/>}
 <div className="row wrap">{!shared&&<Button type="button" disabled={disabled||busy||!candidate} onClick={()=>choose(candidate)}>{text('use')}</Button>}<Button type="button" variant="ghost" disabled={busy} onClick={closeChooser}>{text('cancel')}</Button></div>
 </div>}
 {busy&&<p role="status">{text(shared?'busyShared':'busy')}</p>}{(error||localError)&&<p role="alert">{text(error||'storage')}</p>}{refusal&&<p role="alert">{refusal==='file_type_not_allowed'?text('format'):['format','size','dimensions'].includes(refusal)?text(refusal):refusalCopy(refusal,lang)}</p>}
 </section>;
}
