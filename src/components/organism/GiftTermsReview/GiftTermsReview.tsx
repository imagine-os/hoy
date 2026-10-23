import {useI18n} from '../../../i18n/I18nProvider';
import {Input,Select} from '../../atom/Input/Input';
/** Existing form atoms composed inside S-04; no implied policy defaults. */
export interface GiftTermsDraft{name:string;expiryMode:string;expiry:string;cap:string;scope:string;unit:string;cancel:string;reviewed:boolean}
export const emptyGiftTerms:GiftTermsDraft={name:'',expiryMode:'',expiry:'',cap:'',scope:'',unit:'',cancel:'',reviewed:false};
export function ReviewGiftTerms({value,onChange,disabled=false}:{value:GiftTermsDraft;onChange:(next:GiftTermsDraft)=>void;disabled?:boolean}){const{t}=useI18n();const set=(key:keyof GiftTermsDraft,v:string|boolean)=>onChange({...value,[key]:v,reviewed:key==='reviewed'?Boolean(v):false});return <fieldset disabled={disabled} className="stack-sm"><legend>{t('giftFlow.reviewTerms')}</legend>
<label className="stack-sm">{t('giftFlow.recipientName')}<Input value={value.name} onChange={e=>set('name',e.target.value)}/></label>
<label className="stack-sm">{t('giftFlow.expiry')}<Select value={value.expiryMode} onChange={e=>set('expiryMode',e.target.value)}><option value="">{t('giftFlow.choose')}</option><option value="none">{t('giftFlow.noExpiry')}</option><option value="date">{t('giftFlow.withExpiry')}</option></Select></label>{value.expiryMode==='date'&&<Input aria-label={t('giftFlow.expiryDate')} type="date" value={value.expiry} onChange={e=>set('expiry',e.target.value)}/>}
<label className="stack-sm">{t('vouchers.cap')}<Input type="number" min={1} max={4} value={value.cap} onChange={e=>set('cap',e.target.value)}/></label>
<label className="stack-sm">{t('vouchers.capScope')}<Select value={value.scope} onChange={e=>set('scope',e.target.value)}><option value="">{t('giftFlow.choose')}</option><option value="per_booking">{t('vouchers.per_booking')}</option><option value="lifetime">{t('vouchers.lifetime')}</option></Select></label>
<label className="stack-sm">{t('vouchers.unit')}<Select value={value.unit} onChange={e=>set('unit',e.target.value)}><option value="">{t('giftFlow.choose')}</option><option value="per_person">{t('vouchers.per_person')}</option><option value="per_booking">{t('vouchers.group')}</option></Select></label>
<label className="stack-sm">{t('vouchers.cancelPolicy')}<Select value={value.cancel} onChange={e=>set('cancel',e.target.value)}><option value="">{t('giftFlow.choose')}</option><option value="restore">{t('vouchers.restore')}</option><option value="forfeit">{t('vouchers.forfeit')}</option></Select></label>
<label className="row"><input type="checkbox" checked={value.reviewed} onChange={e=>set('reviewed',e.target.checked)}/>{t('giftFlow.termsReviewed')}</label>
</fieldset>;}
