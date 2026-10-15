# 0066 — Inactive calendar classes and capacity inheritance

- Version: 0.24.0, additive repair
- Date: 2026-10-15
- Intent: Make classes no longer open for booking clearly inactive, and respect the maximum attendees configured on each class template
- Decision: Keep entries visible with muted imagery, readable text status and native disabled buttons. Refresh at session time boundaries. Keep full active classes clickable for waitlist. Honor lower template capacity for new generated sessions, bounded by room/mat limits
- Alternative rejected: Hiding history, removing staff detail access, or rewriting existing booked sessions when a template changes
- Data scope: Local demo storage only. No shared production backend or cross-tab atomicity is claimed. Template edits do not propagate to already-generated sessions
- Files: SessionCalendar and ClassRow components/styles/meta; sessionAvailability helper; joined-session hooks; website strings; customer schedule action guard; MockProvider; focused unit/UI tests; hosted QA workflow
- Verification: Availability classifier, capacity inheritance, ordinary/voucher limits, cancellation release and existing-session preservation have local focused coverage. Full build and real browser captures are required by the hosted QA workflow; local Chromium was blocked by sandbox socket permissions

## Screenshots
Fixtures contain public class catalogue data and synthetic QA sessions only. No private compensation, payment or correspondence is included.

[screenshot: W-04 — Muted inactive classes, ES/EN 390/1280 and desktop dark]
[screenshot: C-02 — Disabled day rows with explicit status]
[screenshot: C-02b — Week cards and mobile rows]
