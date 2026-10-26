/** Verified editorial selections. Explicit ready CMS photos always take priority. */
export const practicePhotos = {
  ligereza: 'practice-ligereza', hibrido: 'practice-hibrido', fuego: 'practice-fuego',
  solido: 'practice-solido', centro: 'practice-centro', alineacion: 'practice-alineacion', pulso: 'practice-pulso',
} as const;
export const planPhotos: Record<string, string | undefined> = {
  pack12: 'pricing-duo', pack12_smtc: undefined, trial: 'plan-trial', single: 'plan-single',
};
export const editorialPhotoSlots = [
  { key: 'site.home.philosophy', label: { es: 'Inicio · paisaje de filosofía', en: 'Home · philosophy landscape' }, alt: { es: 'Amanecer sobre montañas y un valle con neblina', en: 'Sunrise over mountains and a misty valley' } },
  { key: 'site.plans.pack12', label: { es: 'Planes · paquete general', en: 'Plans · general package' }, alt: { es: 'Dos personas en una postura de yoga en pareja frente a una pared de listones', en: 'Two people in a partner yoga pose in front of a slatted wall' } },
  { key: 'site.plans.pack12_smtc', label: { es: 'Planes · paquete de afiliados', en: 'Plans · affiliate package' }, alt: { es: 'Práctica de yoga en pareja', en: 'Partner yoga practice' } },
  { key: 'site.plans.trial', label: { es: 'Planes · clase de prueba', en: 'Plans · trial class' }, alt: { es: 'Dos personas practicando en una barra en el estudio azul', en: 'Two people practicing at a barre in the blue studio' } },
  { key: 'site.plans.single', label: { es: 'Planes · clase individual', en: 'Plans · individual class' }, alt: { es: 'Práctica con aro de pilates en una barra en el estudio azul', en: 'Pilates ring practice at a barre in the blue studio' } },
] as const;
