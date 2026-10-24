# NT-02 — Bounded unsent event bindings

Feature Log row 101; source row 102. The ten-event criterion is not complete. This batch implements frontend preview producers, not delivery or a notification outbox.

| Event | Bounded source |
| --- | --- |
| Welcome | Exact successful mock-registration receipt, current new owner and existing return target. |
| Sign-in code | Only the current active fictional challenge and its actual expiry; no verified account recipient is guessed. |
| Payment confirmed | Canonical electronic class checkout after atomic success and an exact persisted payment check; distinct from the receipt. |
| Payment rejected | The same canonical checkout, with saved rejection-template copy and no inferred bank or release policy. |
| Rescheduled | Actual committed replacement, original/replacement ownership and payment linkage, exact audit proof and class facts. |

Welcome/reschedule use a provider-scoped, ID-only in-memory handoff. The shared Host does not open a modal automatically; a user explicitly opens the preview. The source action, navigation and session behavior remain unchanged. C-04 previews render in the existing success drawer or alongside rejection/recovery status. Cached outcomes without an exact source ID show unavailable rather than guessing.

Saved templates retain actual IDs, versions and active flags. Inactive templates are previews, not published or sent content. The sign-in/confirmation mock-copy contracts explicitly identify their revision and do not pretend to be editable saved template rows. Ready payloads are frozen; source/context changes suppress late results. No message, notification or send-log row is inserted.

Pending booking has no verified booking/hold event; booking release has no verified release source; voucher receipt still needs timing and recipient/template mapping. These remain pending. Existing immutable receipts and bounded studio-cancellation previews are preserved. Other payment producer families—staff settlement, transfers, standalone package/gift/event purchase and historical recovery—are not certified by the canonical C-04 binding.

The CMS descriptor adopts five actual routes with existing table dependencies and no invented notification table or saved-view preferences. Shape fixtures are synthetic; actual action/proof/lifecycle coverage belongs to the referenced tests. Contract/domain, TypeScript, full build, action browser and retained regressions are separate gates; their current execution results are recorded by integration.


Local validation on the isolated PR91 base: full build, 17 preview-contract groups, CMS inventory and 24 negative checker cases, TypeScript, 64 welcome groups, 8 sign-in groups, 27 checkout groups, 4 compiled reschedule groups, 8 delayed-command context groups and 8 retained signup/consent groups passed. Retained registration, consent, atomic reschedule, cutoff and direct-term domain checks also passed. Browser coverage includes EN/ES at 390 and 1280 pixels; retained consent coverage includes both themes. External requests were blocked by the harnesses and no network writes were observed. These are local results, not remote CI, deployment or whole-criterion acceptance.

The reschedule fixture was corrected to match RoomRow (no active field) and PaymentRow; delayed navigation waits for the destination to render before releasing the real held command. Existing database-equality, ownership, financial-history and no-late-preview assertions remain intact. No business command or timer policy was changed.
