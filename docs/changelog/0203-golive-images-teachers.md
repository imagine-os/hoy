# 0203 — Public images and teacher profiles (go-live lane H1)

- **Version:** unreleased (needs Company OS with people 1.10.0 and comms 1.9.0; `company-os.json` is set at merge)
- **Date:** 2026-11-04
- **Prompt intent:** real image upload for the payment QR and teacher photos, and teacher profiles kept in Company OS, for the 6 Nov launch.
- **Decision:** `GET /media/<id>` on the Hoy server streams a published image with the read identity, so the `public_site` policy decides; `/public-files` is no longer forwarded. `SharedImageField` takes an owner record and uploads for real in production. Class schedule › Teachers edits bio, specialties and photo; `mapping.ts` reads them from Company OS and no longer matches the seed by name. Replacing an image saves the record, then deletes the old file (owner, 2026-11-04). A photo that doesn't load renders as no photo.
- **Alternative rejected:** signed storage links in the browser (the link would leave the server), and keeping bios in the build (Jas could not edit them).
- **Files touched:** `server/app.mjs`, `server/testGate.mjs`, `src/data/companyos/publicImages.ts`, `mapping.ts`, `refusals.ts`, `SharedImageField`, `SettingsPage`, `LiveSchedulePage`, `scheduleOps.ts`, website `TeachersPage` and `HomePage`, `Avatar`, `MediaSlot`, `ContentPage`, tests and CI.
