# Website art and asset provenance

Art direction: Aleja Guerra, `hoy web page sistem.pdf` (16 pages), supplied 25 September 2026. Original files were supplied through the Dropbox folder in the request. The site uses optimized WebP derivatives without retouching their contents.

Design: contemporary editorial wellness; cream #F1E7D2, blues #35597D / #5F85B1, restrained pale yellow #F7F3B2. Sunlight, limestone, linen and warm architectural photography. No gold, gloss-heavy ornament or clinical treatment. Editorial serif is limited to the website edition; existing system typography remains unchanged.

| Local name in `public/images/sanctuary/` | Supplied source | Role |
| --- | --- | --- |
| arch.webp | HOME.png | About / third ambient loop anchor |
| mountains.webp | 01_IMAGES HOME landscape | Supplemental background |
| philosophy.webp | PHILOSOPHY.png | Editorial breathing portrait; not a teacher |
| community.webp | FACILITIES.png | Community editorial image; not actual staff |
| hot-yoga.webp | Classes/06.png | Hot yoga · unused since 0051 (no hot class); kept as supplied art |
| barre.webp | Classes/05.png | Barre · unused since 0051 (the seven classes use tone arches); kept as supplied art |
| pilates.webp | Classes/04.png | Pilates · unused since 0051; kept as supplied art |
| meditacion.webp | Classes/02.png | Meditation · unused since 0051; kept as supplied art |
| respiracion.webp | Classes/09.png | Breathwork · unused since 0051; kept as supplied art |
| texture-foliage.webp | TEXTURE 01.png | Supplemental material |
| texture-sunlight.webp | TEXTURE 02.png | Pricing background |
| texture-limestone.webp | TEXTURE 03.png | Cards and panels |
| texture-blue.webp | TEXTURE 04.png | Blue mineral panels |
| stone-enraiza.webp | ENRRAIZA GROUNDING.png | removed in 0039 (retired from W-01 in 0034; the movements no longer exist) |
| stone-fluye.webp | FLUI GO WITH THE FOW.png | removed in 0039 (retired from W-01 in 0034; the movements no longer exist) |
| stone-arde.webp | ARDE BURN.png | removed in 0039 (retired from W-01 in 0034; the movements no longer exist) |
| stone-libera.webp | FREE LIBERA.png | removed in 0039 (retired from W-01 in 0034; the movements no longer exist) |
| hero-sanctuary.webp | New built-in OpenAI image generation | Hero / video anchor |
| ritual-stillness.webp | New built-in OpenAI image generation | Closing scene / video anchor |
| practice-flow.webp | New built-in OpenAI image generation | Supplemental editorial asset |

## 0051 — the seven classes and the real teachers

- The class pages and the home strip draw each class as an arch in its tone (`ClassArch`, D-02); a `site.classes.<slug>` photo marked ready in M-02d fills the arch. The five supplied class stills above stay in the repo, unused, until the studio maps them to the new classes.
- The eight fictional demo portraits (`teacher-*.webp`) and their loops (`video/living-teacher-*.mp4`) were deleted: the teachers on the site are now the studio's real team, and a generated face must never stand next to a real name. A teacher without `photo_url` shows a monogram in the tone of the class they guide.
- The five class loops (`video/living-{hot-yoga,barre,pilates,meditacion,respiracion}.mp4`) were deleted with them; nothing played them any more.

## New image prompts

- Hero: photorealistic sunlit organic-modern yoga sanctuary, wide framing, cream limewash quiet left half for live HTML text, monumental arch and courtyard to the right, oak floor, blue mats, natural leafy shadows, locked-camera composition, no people or text.
- Practice: candid adult practitioner in muted blue activewear in Warrior II, natural anatomy and skin texture, sunny architectural yoga sanctuary, no text; keep whole-body wide framing.
- Ritual: sensory close photograph of folded oatmeal linen and handmade matte blue ceramic on travertine beside water, botanical shadows, natural daylight, locked-camera composition, no text.

Concept imagery is labelled in the public footer. No supplied model image is assigned to a named teacher. Existing `teachers.photo_url` remains authoritative; missing portraits use initials. Ready `media_assets` rows override class/about fallback art. Demo data is unchanged.

**Resumen (ES).** Arte original de Aleja y tres imágenes nuevas. Las fotografías editoriales son conceptos, no retratos verificados del equipo. El CMS conserva prioridad sobre las imágenes de respaldo.
