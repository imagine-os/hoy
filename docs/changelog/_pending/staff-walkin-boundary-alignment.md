# Staff walk-in boundary alignment
Version: 1.6.3. Date: 2026-11-17.

Intent: resume the 15-minute staff registration work only after validating both remote main branches.

Validation: Company OS 1.19.0 and HOY 1.6.2 already shipped the requested feature. Later backend review made the window exclusive at start + 15 minutes and at class end; the frontend hint still used inclusive comparisons.

Decision: align only the staff walk-in display hint with those live boundaries; hide invalid or missing class end times. Keep future classes offered and existing-reservation arrival behavior unchanged. Server authorization, capacity, payment rules and customer booking remain authoritative and unchanged.

Alternative rejected: redoing the already-completed backend rollout or reviving the removed scoped-settings deployment path.

Files: deskSale.ts, targeted boundary tests, package/lock release version and kanban. No new UI elements or copy. No real registrations or production settings were changed by this patch.
