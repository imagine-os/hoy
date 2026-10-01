/** Supplied concept photography from Aleja, September 25, 2026. */
export const siteImage = (name: string) => `${import.meta.env.BASE_URL}images/sanctuary/${name}.webp`;
export const siteVideo = (name: string) => `${import.meta.env.BASE_URL}video/living-${name}.mp4`;
/** Ready for approved, encoded loop files. An empty source never creates a video request. */
export const siteLoops: Record<string, { video?: string; poster: string }> = {
  hero: { video: siteVideo('hero-sanctuary'), poster: siteImage('hero-sanctuary') },
  studio: { video: `${import.meta.env.BASE_URL}video/hoy-studio.mp4`, poster: siteImage('arch') },
  philosophy: { video: siteVideo('philosophy'), poster: siteImage('philosophy') },
  ritual: { video: `${import.meta.env.BASE_URL}video/hoy-ritual.mp4`, poster: siteImage('studio-medellin') },
};

/* 0051: the fictional demo portraits are gone — the teachers are real people now; a missing photo shows a tone monogram. */
