# Hoy go-live, lane H1: Public images and teacher profiles (go-live lane H1)


- **Date:** 2026-11-04
- **Prompt intent:** real image upload for the payment QR and teacher photos, and teacher profiles kept in Company OS, for the 6 Nov launch.
- **Decision:** `GET /media/<id>` on the Hoy server streams a published image with the read identity, so the `public_site` policy decides; `/public-files` is no longer forwarded. `SharedImageField` takes an owner record and uploads for real in production. Class schedule › Teachers edits bio, specialties and photo; `mapping.ts` reads them from Company OS and no longer matches the seed by name. Replacing an image saves the record, then deletes the old file (owner, 2026-11-04). A photo that doesn't load renders as no photo.
- **Alternative rejected:** signed storage links in the browser (the link would leave the server), and keeping bios in the build (Jas could not edit them).
- **Files touched:** `server/app.mjs`, `server/testGate.mjs`, `src/data/companyos/publicImages.ts`, `mapping.ts`, `refusals.ts`, `SharedImageField`, `SettingsPage`, `LiveSchedulePage`, `scheduleOps.ts`, website `TeachersPage` and `HomePage`, `Avatar`, `MediaSlot`, `ContentPage`, tests and CI.

**Review round (lane H1), 2026-11-04.** Removing an image deletes its file, like replacing it; the file is read first and deleted only if its owner and kind match and no record holds it; one retry, then a notice. Unsaved uploads are deleted when replaced, undone or the form closes (best effort: a browser that closes without warning leaves one behind). A `/media` value that is neither saved nor uploaded in this form is never saved. A teacher's save carries `ifMatch` on `photo`. An upload applies at once and Save waits for it. Teacher photos are re-encoded in the browser (1600 px, no metadata); the QR goes unchanged so it still scans. `/media`: per-address concurrency cap, and upstream failures answer 502 or 503 instead of 404.

**Addresses without the `#`, 2026-11-04.** `/site`, `/site/<path>` and `/coming-soon` now redirect (302) to their `/#/` route on the Hoy server instead of a 404; only plain paths and query strings pass. The owner's decision, until the `#` is removed.
