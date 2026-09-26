/** Supplied concept photography from Aleja, September 25, 2026. */
export const siteImage = (name: string) => `${import.meta.env.BASE_URL}images/sanctuary/${name}.webp`;
/** Ready for approved, encoded loop files. An empty source never creates a video request. */
export const siteLoops: Record<string, { video?: string; poster: string }> = {
  hero: { video: `${import.meta.env.BASE_URL}video/hoy-hero.mp4`, poster: siteImage('hero-sanctuary') },
  studio: { video: `${import.meta.env.BASE_URL}video/hoy-studio.mp4`, poster: siteImage('arch') },
  philosophy: { poster: siteImage('philosophy') },
  ritual: { video: `${import.meta.env.BASE_URL}video/hoy-ritual.mp4`, poster: siteImage('studio-medellin') },
};

/** Fictional demo portraits are website-only fallbacks; real teacher URLs always win. */
const sampleTeacherIds = new Set(['tea_andres','tea_paula','tea_santiago','tea_manuela','tea_daniel','tea_isabela','tea_felipe','tea_carolina']);
export const sampleTeacherPortrait = (id: string) => sampleTeacherIds.has(id) ? siteImage(`teacher-${id.slice(4)}`) : undefined;
