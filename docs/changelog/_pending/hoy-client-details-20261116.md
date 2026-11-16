# HOY client details — unreleased, 16 November 2026

Prompt intent: Jas needs to open an existing client, view details and edit them. The production CRM list had no row navigation, while the older review detail route used unsupported/demo workflows.

Decision: keep review mode unchanged and provide a production-only client detail page using the authenticated tenant-bound DataProvider request seam. A client must have exactly one accessible member facet linked to the requested person. Editing is limited to name, phone, birthday and emergency contact. Email, login links, roles, pricing, memberships, payments and bookings are not written. Each changed field is compared against its read value inside one idempotent batch; confirmation comes from a fresh person/member read. Read-only roles and view-as do not receive an editing action.

Alternative rejected: merely link the list to the legacy review details, or broaden teacher permissions while enabling client editing.

Files: admin MemberPage, customers/LiveCustomerList, LiveCustomerDetail and customerDetail, customers/clientStrings and module index string composition, focused contract/UI tests and hosted QA; component inventory and local-only kanban. Existing admin/strings.ts is restored byte-for-byte to HEAD.

Verification: test first failed because the model did not exist; fictional contract suite then passed, including JSON-roundtripped missing optional fields, per-field conflict, cancellation, validation, preserved email/login/unrelated fields and fresh no-op readback. Final TypeScript check passed after the library metadata changes. Route audit confirmed the new production detail has no unresolved adapter findings; its old practice-goals exception and inventory were updated. Final audit rerun and independent final reviews pending. Browser harness built, but local Chromium is blocked by sandbox socket() Operation not permitted; cloud browser could not reach the separate local harness; exact-head hosted QA is required. The production build passed before the isolated copy-module split. No real customer data read or mutated by tests. No release, merge or deployment yet. The full legacy admin translation catalogue is excluded from upload after automatic publishing review rejected the broad file payload; only the new client copy and small index composition change are included. The kanban update remains local only: automatic publishing review rejected uploading the full internal kanban document; it is excluded from the remote change.

Playbook impact: none (frontend-only; no platform contract change).
