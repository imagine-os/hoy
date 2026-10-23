# AD-07 / PL-11 CRM recovery

Source: delegated direct request · 2026-10-23 · requester: project owner

## Prompt

AD-07 and PL-11: CRM read recovery, responsive overflow and Spanish labels. Own admin/CrmPage.tsx and MemberPage.tsx plus narrowly scoped local read adapters/strings/tests. Verify EN/ES and narrow mobile behavior.

Work on imagine-os/hoy from fresh current remote main in your own branch. This is part of Justin's authorized overnight MVP-first FRONTEND completion. Read repository AGENTS.md, relevant .agents/skills SKILL.md files, feature audit and acceptance requirements first. Implement and verify the assigned scope, preserving current design and demo data. Current known deployed main is c21ea3d328be58807719884e5de3fd40a34618a8, but fetch latest.
Concurrent ownership: integration owner handles PR81 payments, shared integration/readiness and final merges. Website owner exclusively handles public Home/Plans/WhatsApp/teacher empty-state fixes. Other workers handle reception, CRM, content and isolated email previews separately. Do not edit shared schema/provider/package/workflow files or another scope without reporting the needed handoff; isolate additions locally when possible. Preserve consent guards, draft/publishing controls, roles and existing data. No credentials, private client notes, customer data, actual authentication, payments, emails, external messages, final domain launch or new services.
Run applicable build, type, domain and browser checks on final code, with real responsive EN/ES interrupted/repeated flows and screenshots where useful. Commit and push scoped non-sensitive source/tests/docs, verify exact remote head, open a draft PR only; do not merge or deploy. If publishing is denied, preserve a patch/bundle and report the exact denial, no bypass or alternate route. Return concrete features/rows, verified vs untested status, PR/head and remaining gaps. Do not count partial rows as complete.

## Response

Implemented the bounded M-06 recovery/translation/responsive slice. [Change record](../changelog/0145-crm-read-recovery.md); [checks, captures and unverified boundaries](../frontend-completion/crm-read-recovery.md). No whole-row completion or backend acceptance claim. Repository has no AGENTS.md or .agents skill files; CLAUDE.md and .claude/skills/ui-spacing/SKILL.md were read and followed.

## Integration follow-up prompt

Integration review mentioned a remaining CRM label fix in your candidate. Please inspect your current CRM/MemberPage EN/ES labels against receipt-only launch semantics and source requirements, identify and repair the concrete label issue if reproducible within owned files. Do not invent policy or edit shared providers. Ask in your recorded response for exact reproduction if not determinable; I am asking integration to record it. Preserve branch and tests, verify changed UI and remote head. The existing normal CLI GraphQL route remains proxy-blocked; don't attempt PR creation or alternate routes. Integration reports read-only merge preview against PR83 is clean. Return exact changed labels and any unresolved discrepancy.

### Clarification

The integration owner's final report identifies the exact CRM issue as the guest/comp label defect, rather than receipt wording. Please prioritize reproducing guest and complimentary booking labels in both languages against source statuses, then repair only the incorrect mappings. Keep unknown statuses honest and do not change business policies. Preserve existing responsive/read-recovery tests.

### Follow-up response

Reproduced guest/comp as incorrectly unconfirmed in CRM history. Added only the two known mappings using existing source labels: Invitado/Guest and Cortesía/Complimentary. Unknown remains Sin confirmar/Unconfirmed. Added a failing-before/passing-after bilingual table/timeline regression. No policy, receipt/invoice, provider or other copy change. No PR creation attempted.
