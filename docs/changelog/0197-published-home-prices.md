# 0197 — Published prices on Home

version: 0.25.0
date: 2026-10-25

Intent: make public Home prices follow the locally published product master (SW-02).

Decision: reuse the saved public-offer resolver for Home and Classic Home. Show published names, amounts and terms on the studio date; suppress unavailable or withdrawn prices. Keep a scoped provider reader with request ordering, cleanup, and focus retry. Preserve legacy demo prices only before publication has been observed.

Alternative rejected: copying the entire saved website batch would also change contact, teacher and launch behavior. Repeating the static launch amounts would leave the reproduced publication mismatch.

Affected: W-01, its pricing projection/reader, bilingual copy, page data contract, synthetic regression tests and CI. No new table, backend connection, real price policy or transaction behavior. FAQ pricing remains a separate saved repair; this does not complete all SW-02 surfaces.
