# 0068 · Shared photo picker

version: 0.24.2
date: 2026-10-15
- Intent: select Content photos from the media library or upload.
- Decision: reusable bilingual SharedImageField with search/source filtering, preview and explicit draft selection; reversible remove/replace. Existing per-placement references follow saved provider rows.
- Browser-private uploads: JPEG/PNG/WebP, 10 MB input, 40 MP decoded limit, optimized WebP up to 1600 px. Canvas re-encoding strips metadata. IndexedDB commit must complete before selection is offered; failures keep the current image. Originals remain with the user. Clearing browser storage loses local copies; no server upload or shared storage is claimed. Non-mock providers cannot import local uploads.
- Alternative rejected: silently posting personal uploads into a public repository or pretending object URLs survive reload.
- Files: SharedImageField component/meta/styles; localMediaStore; useMediaLibrary; mediaLibrary projection; MediaPage; media strings; picker QA script/workflow.
- Verification: model and spacing checks pass locally; local aggregate typecheck is memory-limited. Hosted full build/typecheck and four QA suites pass. Picker browser checks cover catalog choice, preview, remove/undo, rejected format, private durable upload, tenant isolation and reload.
- Integration: Content's photo_url field uses value/onChange, disabled and label props. Parent Save/Cancel owns persistence and publication. Provider persistence failure handling is in the parallel Content work.
