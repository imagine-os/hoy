import { useContact, useWhatsappLink } from '../admin/settings';
import { publicWhatsappTarget, whatsappDigits } from '../../components/molecule/PublicWhatsappLink/whatsappTarget';
import type { ContactIntent } from '../../tenant/contacts';

/** Scoped public presentation adapter; Settings/provider contracts stay unchanged. */
export function usePublicWhatsapp() {
  const wa = useWhatsappLink();
  const profile = useContact();
  const safe = (intent: ContactIntent) => {
    const original = wa.resolve(intent);
    const front = wa.resolve('frontDesk');
    const candidates = [original, front, { ...front, whatsapp: profile.whatsapp }];
    const target = publicWhatsappTarget(original.whatsapp, [front.whatsapp, profile.whatsapp]);
    const chosen = candidates.find(candidate => whatsappDigits(candidate.whatsapp));
    return { ...original, ...(chosen ?? {}), whatsapp: chosen?.whatsapp ?? '', note: target.fallback ? undefined : original.note };
  };
  return {
    resolve: safe,
    target: (intent: ContactIntent, text?: string) => {
      const original = wa.resolve(intent);
      return publicWhatsappTarget(original.whatsapp, [wa.resolve('frontDesk').whatsapp, profile.whatsapp], text);
    },
    display: (intent: ContactIntent, lang: 'es' | 'en') => {
      const resolved = safe(intent);
      return resolved.whatsapp === wa.resolve(intent).whatsapp ? wa.display(intent, lang) : resolved.whatsapp;
    },
  };
}
