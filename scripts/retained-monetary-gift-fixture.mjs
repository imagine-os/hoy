import {admissionFixture,admissionIds,admissionNow} from './session-admission-fixture.mjs';
export const giftAuditIds={user:admissionIds.user,other:'usr_teach',super:'usr_super'};
export const giftAuditNow=admissionNow;
export async function retainedGiftFixture(source=process.cwd()){return admissionFixture(source);}
