import { digitsOf, isPhone } from '../../../i18n/format';
import { validBirthday } from '../profileSave';

/** Browser-demo field-size safeguards; these do not define identity-provider policy. */
export const SIGNUP_LIMITS = Object.freeze({ first:100, last:100, email:254, whatsapp:40, ecName:200, ecPhone:40, password:128 });
export interface SignupFields { first:string; last:string; email:string; whatsapp:string; birthday:string; ecName:string; ecPhone:string }
export function signupErrors(form:SignupFields):Partial<Record<keyof SignupFields,string>> {
  const errors:Partial<Record<keyof SignupFields,string>> = {};
  for(const field of ['first','last','ecName'] as const) {
    const value=form[field].trim();
    if(value.length<2)errors[field]='customer.form.required';
    else if(value.length>SIGNUP_LIMITS[field])errors[field]='customer.signup.tooLong';
  }
  if(form.email.trim().length>SIGNUP_LIMITS.email)errors.email='customer.signup.tooLong';
  else if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()))errors.email='customer.form.email.err';
  for(const field of ['whatsapp','ecPhone'] as const) {
    if(form[field].trim().length>SIGNUP_LIMITS[field])errors[field]='customer.signup.tooLong';
    else if(!isPhone(form[field],field==='whatsapp'?12:10)||digitsOf(form[field]).length>15)errors[field]='customer.form.phone';
  }
  if(!validBirthday(form.birthday))errors.birthday='customer.profile.atomic.birthday';
  return errors;
}
