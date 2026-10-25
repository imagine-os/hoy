# Frontend CMS contract maintenance

This branch adopts only the S-09 class-voucher recipient-preview slice. Adjacent queue, payment and issuance dependencies are inventoried without claiming new acceptance of their whole workflows. Backend mappings remain pending; events are browser-local.

Descriptors in `src/cms/features/` are discovered by the shared registry. Preserve the shared contracts, registry and checker across feature branches. Forms and review cards use `views=[]`; saved table preferences must reuse `TableViewConfig`, not another storage or filtering engine.

For an adopted feature, update route/spec/component references, consumed entities and fields, context/error/loading/retry states, synthetic fixtures and relevant actual provider/domain/browser tests together. Add newly introduced helper and test dependencies to source fingerprints. Record browser-only extensions only when they already exist in runtime source; preview payloads are not database columns.

The JSON blocks marked `cms-data:start` / `cms-data:end` are strict JSON. Source/test hashes are SHA-256 of file bytes. The review digest is SHA-256 of lexically sorted `path:sha256` source entries joined by newline with no trailing newline. Fixtures and test-review metadata carry that digest. Review the change and assertion coverage before refreshing it; never regenerate hashes merely to suppress drift.

Run `npm run check:cms`, `node scripts/check-cms-contracts.mjs --self-test`, and affected domain/provider/browser checks. The build enforces inventory before compilation. Referenced tests and shape fixtures do not claim execution, full seed coverage or backend authorization. Retain exact source and actual execution evidence separately.

Before integration, re-read main and reconcile the union of descriptors, fixtures and shared source/test changes. Recheck fingerprints after that review and rerun affected gates. Independent green drafts do not certify their combined tree. No remote database, credentials, subscription transport or real sending is connected by this foundation.
