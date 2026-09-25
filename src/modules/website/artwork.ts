/** Supplied concept photography from Aleja, September 25, 2026. */
export const siteImage = (name: string) => `${import.meta.env.BASE_URL}images/sanctuary/${name}.webp`;
/** Ready for approved, encoded loop files. An empty source never creates a video request. */
export const siteLoops: Record<string, { video?: string; poster: string }> = {
  hero: { poster: siteImage('hero-sanctuary') },
  studio: { poster: siteImage('arch') },
  philosophy: { poster: siteImage('philosophy') },
  ritual: { poster: siteImage('ritual-stillness') },
};
