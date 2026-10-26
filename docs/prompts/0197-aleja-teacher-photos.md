# Aleja teacher photograph corrections

Source: delegated implementation instruction · 2026-10-26 · owner

## Prompt

> Implement narrow teacher-photo corrections in imagine-os/hoy from Aleja's verified drawing. User explicitly requested applying her new PDF from Hoy Yoga Studio Programming to this repository.
>
> Preserve stable teacher IDs and CMS photo_url overrides.
>
> Carolina mapping is unresolved, keep her directory unchanged; Andrea/Jennifer no clear replacement arrows. Implement only clear source-backed mappings and group image. No backend/auth/payment/email/security/credentials/access changes, no tracker/kanban or unrelated feature edits.
>
> Do NOT operate browser now: Wix task owns BMM UI; start shell/file inspection and code only.
>
> Do not merge or deploy from this lane.

## Response

Applied the clear blue-top Raghu/Leandro selections, Clara's wood-box portrait, the dark-blue arrow's Andre Cardona portrait, and the matching four-person group placement to the Latest and Photos teacher surfaces. Kept the separate Andrea and Jennifer profiles and Carolina's conflicting directory assignment unchanged. CMS overrides and stable teacher IDs are preserved. Added provenance and catalogue-drift checks. Hosted browser CI passed on the first head; new exact-head CI must verify the Latest follow-up. Local browser verification remains pending until the Wix task releases the browser; no merge or deployment performed. Kanban was left untouched per the explicit scope restriction.

See [changelog](../changelog/0197-aleja-teacher-photos.md) and [source receipt](../reference/aleja-teacher-photos-2026-10-26.md).

## Integration scope follow-up

> The source explicitly shows Latest · Current, so completing the user's requested teacher-photo changes requires those clear mappings on the default teacher surfaces too. Continue narrow implementation in the same PR: apply verified teacher/group photo corrections to bare /site and /site/teachers through their existing fallback/configuration mechanism, preserving CMS overrides, stable IDs, current edition selection and unrelated layout/features. Do not switch the whole site edition or bundle held feature code. Carolina conflict stays unchanged; separate Andrea/Jennifer unchanged.

Applied only the verified teacher and group fallbacks to Latest, preserving the edition default and unrelated Photos sections. Added exact per-edition mapping, CMS, pending-profile and responsive/dark CI coverage. No tracker changes, merge or deployment.
