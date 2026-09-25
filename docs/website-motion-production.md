# Hoy website — motion production handoff

Prepared 25 September 2026. Scope: public website only. Art direction follows Aleja's supplied `hoy web page sistem.pdf`.

## Creative intent

The camera stays still; the space quietly lives. Warm architectural daylight, mineral plaster, woven linen and gently moving greenery should feel observed rather than animated. Cream `#F1E7D2`, blue `#35597D` / `#5F85B1`, and selective pale yellow `#F7F3B2`. Preserve true shadows, skin texture, spatial depth and negative space. No gold, glitter, exaggerated spirituality, fog, light leaks or constant zooming.

The website should already feel complete with its posters. Motion is a progressive enhancement, not a loading dependency.

## Provider check and production budget

Magnific was checked on 25 September 2026. Credits were available, but the plugin exposed no selectable video models. This is a model-availability issue. No video generation was submitted.

Fallback production candidate: fal `fal-ai/kling-video/o1/image-to-video`, named **Kling O1 First Frame Last Frame to Video [Pro]**. The live endpoint schema supports a first image, optional final image, a prompt and duration; it permits 3–10 seconds. Use 10 seconds for this project, and send the identical approved image as first and last frame. This improves the endpoint match but does not guarantee an invisible loop: editorial seam review remains necessary.

Live price checked 25 September 2026: **US$0.112 per generated second**.

| Scope | Generations | Generation cost |
|---|---:|---:|
| One 10-second test | 1 | $1.12 |
| Three selected desktop scenes, first pass | 3 | $3.36 |
| Three scenes, up to three attempts each | 9 | $10.08 |
| Optional vertical hero, up to three attempts | 3 more | $3.36 extra |
| Full three-scene + vertical-hero retry allowance | 12 | $13.44 |

These are video generation costs only, excluding taxes, any paid upscaling or additional models. Recheck price before generation. No fal jobs were submitted; only availability, schema and pricing were inspected.

Alternative comparison: H3 Max reference-to-video is $0.16/sec at 1080p ($1.60/10s), with one image within its included reference-token allowance. Its inspected reference endpoint does not provide explicit first/last image anchors. Seedance 2.5 US supports an ending image and H.264 output, but bills 1080p at $0.02808 per 1,000 output tokens; its documented formula produces about $13.65 for 10 seconds at exactly 1920 × 1080 and 24 fps. Kling's explicit anchors and predictable lower price make it the proposed first test, not an assertion of universal model superiority.

Primary pricing sources:

- https://fal.ai/models/fal-ai/kling-video/o1/image-to-video
- https://fal.ai/models/minimax/h3-max/reference-to-video
- https://fal.ai/models/bytedance/seedance-2.5/us/image-to-video

## Shot list

| Asset | Website placement | Motion | Composition and crop | Deliverables |
|---|---|---|---|---|
| `hoy-hero-breathing` | Opening hero | A few leaf tips sway less than 1–2 cm; very light linen movement if present | Use the exact approved hero still, 16:9 landscape, preserve clear space behind the headline | 10s source, looped MP4/WebM, AVIF/WebP poster |
| `hoy-studio-light` | The space / About page | A soft leaf shadow moves in a tiny repeating arc across the wall | Selected architectural source is 2:3 portrait; preserve its crop, static geometry and stable exposure | 10s source, looped MP4/WebM, AVIF/WebP poster |
| `hoy-ritual-pause` | Pause before booking / closing section | A linen edge lifts slightly and settles; optional very subtle leaf reflection | Material still life, mat/linen/ceramic, 16:9 landscape with mobile-safe center | 10s source, looped MP4/WebM, AVIF/WebP poster |
| `hoy-hero-breathing-mobile` | Optional mobile hero | Same motion direction as desktop | Separate 9:16 art direction only if the landscape crop loses the key subject | Optional 10s generation, 720px export + poster |

Use actual selected images for every shot. Do not create substitute architecture once the layout is approved. Keep teachers' real portraits and class imagery as photographs, unless future filmed footage is supplied: face and body motion bring unnecessary identity and anatomy risk into ambient web loops.

## Copy-ready generation prompts

### Hero — `hoy-hero-breathing`

`@Image1 and @Image2 are the identical approved photograph and are exact framing anchors. A premium contemporary yoga sanctuary observed from a completely locked tripod camera. Retain the exact architecture, objects, material texture, composition, lens, lighting direction and exposure of the source photograph. During ten seconds only the tips of the existing tropical leaves make one tiny, slow, natural sway and return to their opening position. If linen exists in the image, its free edge breathes almost imperceptibly and settles back. The solid walls, furnishings and floor remain perfectly still. The camera is motionless for the entire shot, including the first and last frames. No pan, tilt, zoom, push-in, focus pull, lens breathing or handheld movement. No new objects, people, particles, fog, transitions or text. Stable daylight and color. Calm low-amplitude motion, with matching state and near-zero motion at both ends, intended for an invisible repeating background loop.`

### Space — `hoy-studio-light`

`@Image1 and @Image2 are the same architectural still. Preserve all architecture and every edge without deformation. The camera is rigidly locked throughout this ten-second shot. Only the existing soft botanical shadow travels in a very small gentle arc across the warm plaster and returns to exactly where it began, as if a leaf just outside the window swayed once. Maintain exposure, white balance, sun direction, focus and contrast. No accelerated sunrise, sunset, flicker, pulsing illumination, moving furniture or scene reconstruction. No people or text. The first and final state should align, with slow almost imperceptible motion suitable for an endless calm website loop.`

### Ritual — `hoy-ritual-pause`

`Animate the identical approved still-life image supplied as @Image1 and @Image2. A totally stationary close architectural detail of the existing yoga mat, woven linen and ceramic objects, preserving the exact source composition and natural surface grain. Over ten seconds only the very outer edge of the existing linen lifts a few millimeters with a gentle breath of air, then rests in its opening position. If no loose linen edge exists, move only one existing leaf tip. No material melting, object movement, new props, dust, steam, sparkles, camera movement, focus changes or changing exposure. Natural warm daylight, understated physical motion and an invisible return to the starting state.`

## Example fal payload

The source must be an uploaded, accessible image URL. Replace the two identical URL values with the approved asset's actual upload URL; never send these placeholders.

```json
{
  "endpoint_id": "fal-ai/kling-video/o1/image-to-video",
  "input": {
    "start_image_url": "APPROVED_SOURCE_ASSET_URL",
    "end_image_url": "APPROVED_SOURCE_ASSET_URL",
    "duration": "10",
    "prompt": "USE_THE_SCENE_PROMPT_ABOVE"
  }
}
```

Use fal `submit_job`, retain the returned request ID, poll that exact job, and collect the result. A timeout is not grounds for a second submission. Record source path, prompt, endpoint, duration, request ID, result URL, generation cost and chosen take in the production manifest. Store local source/master outputs and web derivatives with the website assets.

## Seam finishing and quality gates

1. Inspect the entire take at normal speed and frame-by-frame at the join. Reject camera drift, geometry wobble, illumination pumping, spontaneous new objects, ghosting or robotic foliage.
2. Compare the first and final frames. Matching images are necessary but not sufficient: the *direction and speed* of movement must also feel continuous. Prefer a take whose ends both settle naturally.
3. Trim any frozen lead-in or lead-out. If the seam is visible, choose the most similar pair of frames, or apply a short 0.3–0.6s overlap dissolve only where it does not double architecture or leaves. Recheck at normal speed over at least five repeats.
4. Do not use forward/backward playback as the default fix. It visibly reverses fabric, steam and water. Use it only when the physical movement remains convincing.
5. If a soft dissolve cannot hide the join cleanly, spend a second take rather than disguising it with heavy VFX.
6. Normalize export frame rate to 24 or 30 fps, remove audio entirely, and save a high-quality source/master before web compression. Upscaling is optional; inspect source resolution first.
7. Deliver H.264 MP4 with `faststart`, `yuv420p`, no audio; offer VP9 WebM when the file savings justify the additional source. Aiming for roughly 2–4 MB per hero loop and 1–2 MB per secondary loop is an engineering target, not a guaranteed output size.

## Website motion behavior

- Load the still poster immediately. Once approved clips are supplied, add a video-readiness state and opacity transition so the ready video fades in without changing the image crop or causing layout shift. This fade is a pending integration task. `muted`, `playsInline`, `loop` and no controls for decorative media are already supported. The current Pause motion control is local to the Home page and resets on navigation; the future About/studio loop needs its own visible pause control or shared motion state.
- Play only the visible background. Use IntersectionObserver and pause on hidden tabs. The current component requests each video when its scene becomes visible; it does not prefetch before the viewport. Never download all loops on the initial load.
- If autoplay fails, leave the poster visible. On `prefers-reduced-motion`, Save-Data, or explicit Pause motion, show the poster and avoid downloading ambient loops.
- Keep text and booking controls in real HTML above the visual, with stable contrast. Video must not contain copy, buttons or interface chrome.
- Preserve natural scrolling. One section may have a gentle 1.00→1.035 scale and at most 24px translation as it crosses the viewport. It should stop when the user stops scrolling. Do not scrub a long video on every scroll event or hijack the scroll wheel.
- Section entrances: 450–650ms opacity + 16px rise, once, triggered near viewport entry. Avoid animating every text line separately.
- Cards and buttons: tactile surfaces remain CSS/SVG textures. Hover changes shadow and elevation by only 1–3px; focus is immediate and distinct. No autoplay videos inside every card and no shimmer on repeat.
- A restrained breathing circle may guide a calm pause using a 4s expansion/6s release rhythm, but only as an intentional optional interaction, not a decorative element competing with booking.

## Delivery checklist

- [ ] Approved source poster for each scene.
- [ ] One pilot generated and reviewed before a batch.
- [ ] Each selected loop passes five-repeat seam review.
- [ ] MP4, optional WebM and responsive posters delivered.
- [ ] Motion Pause control, reduced motion, visibility pause and poster fallback verified.
- [ ] Class schedule, teacher data and booking integrations preserved.
- [ ] Desktop, mobile and touch scroll behavior reviewed.
- [ ] Production manifest and costs committed alongside the website release notes.

## Exact production inputs and integration

All paths are relative to this repository. These optimized stills are production-ready anchors, not placeholders.

| Clip | Source anchor | Public anchor URL | Integration |
| --- | --- | --- | --- |
| Hero | `public/images/sanctuary/hero-sanctuary.webp` | https://imagine-os.github.io/hoy/images/sanctuary/hero-sanctuary.webp | `siteLoops.hero` in `src/modules/website/artwork.ts` |
| Studio | `public/images/sanctuary/arch.webp` | https://imagine-os.github.io/hoy/images/sanctuary/arch.webp | Optional About photograph upgrade; preserve CMS override priority |
| Ritual | `public/images/sanctuary/ritual-stillness.webp` | https://imagine-os.github.io/hoy/images/sanctuary/ritual-stillness.webp | `siteLoops.ritual` in `src/modules/website/artwork.ts` |

The studio source is portrait: keep the source aspect ratio, do not stretch to landscape. The philosophy portrait remains a still; do not animate this model's face. The generated practice-flow.webp is a supplemental editorial image, not a named teacher portrait.

After generation and seam review, place the approved hero and ritual MP4s in `public/video/`, then add their base-relative paths as `video` in the matching `siteLoops` entry. AmbientScene already supports silent inline looping, poster fallback, pause/resume when offscreen or the document is hidden, reduced-motion and data-saver handling. HomePage supplies its own manual motion control; that state is page-local and resets on navigation. Add the video-readiness fade when integrating the approved clips. No video URLs are shipped until files exist and pass visual review. The About/studio loop is not implemented yet: integrate the same component with a page-visible pause control or shared motion state, preserving any ready CMS media.

### What is already implemented

- Native scrolling; no scroll hijacking.
- Capped ±24px photo parallax, restrained entry reveals, tactile hover/press responses.
- Home-page motion pause control that resets on navigation, reduced-motion overrides, static-first rendering.
- No animated camera video or generated loops were produced in this release.

### Acceptance before production video is activated

Check five consecutive repeats at actual desktop and mobile crops. Approve only if the join has no visible camera jump, lighting pulse, doubled leaves or texture melting. Preview both at real speed and frame-by-frame. Matching first and last images helps but is not a guarantee. Crossfade only a small ending region if motion direction and shadow position match; reject bad takes instead of hiding them beneath strong blends. Export silent MP4/H.264, no audio track, fast-start, 24fps, target 2–4 MB per background; retain the master outside the public web payload. Do not download three loops at initial page load.

**Resumen (ES).** La web ya funciona con las imágenes definitivas. Faltan tres bucles ambientales: cámara inmóvil, vegetación y sombras suaves, sin cortes visibles. Presupuesto fal: USD 3,36 primera ronda / USD 10,08 con tres intentos por escena. No se generaron videos ni se gastaron créditos.
