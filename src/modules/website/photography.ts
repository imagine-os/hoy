/** Selected studio photographs supplied for this website, October 2026. Originals remain in Drive. */
export const studioPhoto = (name: string, width = 960) => `${import.meta.env.BASE_URL}images/studio-2026/${name}-${width}.webp`;
export function studioPhotoProps(name: string, portrait = false, priority = false) {
  return { src: studioPhoto(name), srcSet: `${studioPhoto(name, 480)} 480w, ${studioPhoto(name)} 960w`, sizes: '(max-width: 700px) 100vw, 50vw', width: 960, height: portrait ? 1440 : 640, loading: priority ? 'eager' as const : 'lazy' as const, decoding: 'async' as const, fetchPriority: priority ? 'high' as const : 'auto' as const };
}
// Aleja's 2026-10-26 drawing explicitly links Andre Cardona (not the separate Andrea
// profile) to the hand-on-hip portrait. Carolina's conflicting arrows remain pending.
// Source IDs and conversion provenance: docs/reference/aleja-teacher-photos-2026-10-26.md.
const teacherPhotos: Record<string, string> = { tea_leandro: 'teacher-leandro', tea_tatiana: 'teacher-tatiana', tea_sara_c: 'teacher-sara-crismatt', tea_raghu: 'teacher-raghu', tea_maria_camila: 'teacher-maria-camila', tea_sara_e: 'teacher-sara-estrada', tea_carolina: 'teacher-carolina', tea_andre: 'teacher-andre-cardona', tea_clara: 'teacher-clara' };
export const teacherStudioPhoto = (id: string) => teacherPhotos[id] ? studioPhoto(teacherPhotos[id]) : undefined;
