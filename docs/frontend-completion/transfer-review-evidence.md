# Transfer review evidence

PG-04, Feature Log57/source58: a pending review could show **Receipt unavailable** yet approve the transfer and activate classes. Fresh approval now requires the same evidence validation in the visible review state, handler and staged command. Validation checks a complete PNG/JPG data URL, canonical base64, declared/decoded byte count, file/MIME/signature/size and any existing immutable upload proof. Legacy receipts are never given a fabricated proof.

In a browser, validation additionally requires successful raster decoding, positive dimensions and the existing20-million-pixel bound. Readiness is tied to an immutable receipt scope/image snapshot plus provider and actor/role/query context. The saved receipt is read again before and after inspection. A changed or missing receipt cannot enable the old operation. Fresh handler and transaction checks remain necessary even when the visible button was previously enabled.

Rejection with the existing amount/reason/comparison requirements remains available when evidence is missing. Already-approved/rejected replay preserves the original result, payment document, history and entitlement if the image later becomes unavailable; this change never backfills evidence or reactivates classes. Existing exact-amount, trial/contact, tenant, current-context and final-admission guards remain in place.

## Verification contract

- `node scripts/test-transfer-review-evidence.mjs`: direct structural/proof rejection without writes; valid retained and legacy evidence; missing-image rejection; completed replay; context loss during an evidence read.
- `QA_BASE=http://127.0.0.1:5695 QA_OUTPUT=/tmp/hoy-review-evidence node scripts/test-transfer-review-evidence-ui.mjs`: actual EN/ES390/1280 review plus direct browser commands. Missing and structurally plausible but undecodable images block native Enter/click and direct approval. Valid PNG/JPG approvals, lost-acknowledgement reconciliation, completed missing-image history/replay, rejection and logout during decode retain their contracts.
- Six pre-existing domain suites require only mechanical positive-image fixture corrections: complete image fields or a genuinely decodable tiny fictional PNG with matching byte size. Every existing assertion expression and intentional invalid-image case remains unchanged. Baseline, exposed-setup failure, corrected results and assertion-AST hashes are retained privately for integration.

Node has no browser raster decoder: its tests validate structural bytes and retained proof only. No caller-supplied trusted flag or third-party decoder is introduced. Actual raster-inspection coverage belongs to the browser suite. This is a local mock safeguard, not server evidence verification, private file storage or real Bancolombia integration. Confirmation timing, holds and partial-payment policy remain unchanged. Full build and compiled validation belong to final integration; no release is claimed here.
