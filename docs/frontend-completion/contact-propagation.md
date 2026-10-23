# SW-05 / AD-05 contact-email propagation — 2026-10-23

Verification branch: `codex/contact-propagation-20261023`, based on freshly fetched remote main `455843fda97c7a0c9979b3331d11690d9653f5e7` (PR81). Separate saved website candidate remains `a4303bd9ef703c5751cc7257a06bd7d258bbfec7`; the original saved launch branch remains `e1d704cd`.

## Literal source requirements and bounded scope

- SW-05 — **Single brand name and email**, phase **MVP Oct 30**, criterion: “Website, app, emails and manual use the same brand name and contact email.” Decision PC-08 remains unresolved.
- AD-05 — **General settings and payment details**, phase **MVP Oct 30**, criterion: “Contact, front-desk hours, holidays, Bancolombia account, QR image and Bre-B key are edited in Settings and show on the website, app and emails.” Decision Q-15 remains unresolved.

This test covers only contact-email propagation and existing configuration-backed labels. It does not accept the whole rows, choose final brand/email values, validate hours/holidays/banking/QR/Bre-B, or prove real email delivery/configuration. The displayed brand and legal identity are read from the existing disabled Settings fields; their policy distinction is not changed.

## Verification contract

Run against a production preview:

```sh
QA_BASE=http://127.0.0.1:5180 node scripts/test-contact-propagation-ui.mjs
```

Optional frozen-candidate comparison:

```sh
QA_LABEL=main-455843fd QA_CANDIDATE_BASE=http://127.0.0.1:5182 node scripts/test-contact-propagation-ui.mjs
```

Both servers expose their generated release.json. The test records their exact source SHA, so a preview is not silently attributed to the current checkout. Candidate comparison used a preserved static copy of the previously built `a4303bd9` artifact; main was freshly built from `455843fd`.

`QA_OUTPUT` redirects artifacts; `QA_CAPTURE=0` omits screenshots for narrow diagnostics and `QA_LANGS=es` narrows language while developing the harness. The final verification uses default ES+EN and screenshots.

The actual Settings profile Save control writes fictional `.invalid` email addresses and explicit fixture confirmation flags. Five consumers are mounted before saving: ContactPage, SiteShell (on the same page), MorePage, EmailsPage and the manual's actual LiveBlock contact directive. Assertions run before any consumer reload, proving same-origin MockProvider storage-event propagation, then repeat after reload. A separately isolated native customer session reads the persisted snapshot before/after its own reload; it does not claim cross-device synchronization.

Cases:

1. New email with email confirmation off: contact value/href plus each consumer's existing bilingual pending label.
2. Changed email with confirmation on: updated value/href and no pending label.
3. Blank saved email with confirmation off: existing configured tenant fallback with pending label; Settings itself retains the blank saved input on reload.
4. Legacy all-confirmed flag overriding a false per-email flag.
5. Missing stored profile: existing default contact/confirmation behavior, including reload.

Each captured contact region is checked at 390/1280 after font/layout settling. Email preview language is selected explicitly; envelope spacing is normalized only for the separate locale marker assertion. Email address/href and confirmation-value assertions remain exact. Public brand wordmarks, preview brand name and LiveBlock legal identity are checked against the same existing Settings identity values.

The suite verifies unchanged `message_log`, `email_templates` and sender/reply-to communication settings. External HTTP is blocked; no send/test-send or communication-configuration action is clicked. Manual captures contain only the contact LiveBlock, never surrounding internal prose. All changed fixture profile values and display names are fictional.

## Source comparison and file boundaries

Main and saved candidate have byte-identical SettingsPage, shared settings reader, EmailsPage and LiveBlock implementations. MorePage differs only in its directions helper. Candidate ContactPage/SiteShell contain the separate saved WhatsApp repairs, while their email reading still uses the same profile contact source. No WhatsApp or pricing behavior is retested by this batch.

No AD-01 publication implementation, customer/profile runtime, email runtime, shared provider/schema, auth or configuration file is edited for this verification. No external questions/messages, Sheets operations or blocked GitHub API attempts occur. If a product defect is reproduced, its exact evidence and any required shared interface must be reported before expanding these boundaries.

## Evidence and remaining gates

[Rendered results](../screenshots/contact-propagation/results.json) record artifact sources, ES/EN case groups, mounted/reload observations and page errors. Only main captures are stored; candidate repeats the same assertions without duplicate captures.

Harness construction initially needed corrections for the existing hidden Toggle input (click its visible label), relative card locator semantics, literal confirmation wording and whitespace in the envelope marker. A mixed-role multi-tab setup also made reload role attribution ambiguous because session state is shared in localStorage. Final live observers use one existing demo role; the native customer readback is isolated separately. These are recorded as harness corrections, not product fixes, and no runtime assertion was removed.

The contact-email slice remains separate from final identity approval (PC-08), full AD-05 scope (Q-15), authenticated persistence, external email delivery and owner acceptance. Existing manual visibility (Q-14) is not changed by rendering the already-existing directive.

## Final local outcome

The complete default-language/default-capture run passed on both exact artifacts: **16 case groups, zero page exceptions, 60 main-only contact-region captures**. Both mounted observers and reload readback pass for all named surfaces; isolated native customer-session reloads pass for every changed/pending/fallback case. Legacy confirmation and missing-profile defaults pass in both languages on both builds. Templates, message logs and sender/reply-to communication settings remain unchanged.

No product failure was reproduced and **no runtime repair or shared provider/schema edit is needed** for this named email slice. Runtime files remain byte-identical to main `455843fd`; this branch adds only the local test and verification records. The baseline main full build/typecheck/spacing/manual gates passed at `455843fd` before testing. These results are local frontend evidence, not live/server/email-provider or whole-row acceptance.

Visually inspected representative regions: [EN pending contact card](../screenshots/contact-propagation/en-changed-pending-contact-390.jpg), [EN confirmed email envelope](../screenshots/contact-propagation/en-changed-confirmed-email-envelope-1280.jpg), [ES fallback manual contact block](../screenshots/contact-propagation/es-blank-fallback-pending-live-contact-390.jpg).
