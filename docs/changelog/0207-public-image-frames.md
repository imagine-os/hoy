---
date: 2026-11-13
version: 1.2.4
prompt: docs/prompts/0207-public-image-frames.md
intent: Fill public photo frames and center their subjects, including staff.
decision: Cover-fill photographic frames, preserve studio portrait proportions and use a head-conscious crop for uploaded staff portraits.
rejected: Editing Content records, replacing selected photographs, stretching images, or cropping the complete finale artwork.
files: ClassArch.css, ClassArch.tsx, ClassArch.meta.ts, photography.css
---

The large class arch previously overrode the natural 2:3 frame to 4:5 while retaining contain sizing, exposing side gutters. Cover sizing now fills the arch. Staff cards use consistent 2:3 cover-filled frames; studio portraits remain centered and CMS portrait crops favor the upper center. Booking photos cover their banner. CMS URLs, biographies, bookings, history and admin are untouched.

Validation: pending responsive visual QA and two review rounds. No deployment claimed.

Follow-up 2026-11-14: Justin's screenshots confirmed deployed 4:5 portrait slots beside 2:3 placeholders and contain-sized class images. The same 2:3 rule now targets both pending and loaded portraits, and portrait pixels are positioned within the reserved frame so arbitrary image intrinsic dimensions cannot expand it. Added responsive light/dark browser assertions and captures. Existing crop guards updated to the new cover-fill contract. Production release remains pending until browser QA and both reviews pass.

Verification: review and production builds, focused photographic guards passed locally. Responsive browser CI at 390/768/1218/1440 in light and dark passed; downloaded captures confirm filled Fire/Hybrid frames with full poses and equal placeholder/photo heights. Two independent code reviews completed; identified ratio and legacy test expectations corrected. No live-data mutation tested or performed. Rollback is v1.2.3 through the production workflow.
