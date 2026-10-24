import type { CmsFeatureContract } from '../contracts';

// Bounded action-preview producers only; referenced tests are not execution-status claims.
export default (
/* cms-data:start */
{
  "id": "nt02-launch-previews",
  "revision": 1,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "Current tenant/actor/effective role/provider/exact pathname+query and producer intent; welcome changes to committed new owner through guarded transition; fictional sign-in challenge has no account recipient. Browser-local preview only.",
  "sources": [
    {
      "path": "scripts/nt02-auth-harness.tsx",
      "sha256": "96395ad1b85a5678fba8a8b7d999f7d6e36e04a9bc8520788aeee353ec1b5ac6"
    },
    {
      "path": "scripts/synthetic-admission-contact.mjs",
      "sha256": "697a6fdeaeda7ba9e5d01a02467bf04ead37b57ed128dfa41c62006646bdda85"
    },
    {
      "path": "scripts/test-nt02-auth-common.mjs",
      "sha256": "4c5d1131282c8e25dd3b3f31a3f6395508ffad70bf5c24b5c81d70a64fa051a6"
    },
    {
      "path": "scripts/test-nt02-payment-harness.tsx",
      "sha256": "dd9918b5a9c497da7feee9f15a06d628c309f92100187f31c6b0c42fdacdafa9"
    },
    {
      "path": "scripts/test-nt02-reschedule-fixture.mjs",
      "sha256": "28cbf6e83c749f67755d22a1045797ab5c438fe8f6b6298b01aa72aab6bab9cd"
    },
    {
      "path": "src/app/App.tsx",
      "sha256": "4e7812d49d691de48279970f58b94e7227c00d4c772d9aa8bc4c046244684024"
    },
    {
      "path": "src/app/registry.ts",
      "sha256": "82c72c2cb6444a1203261e27469535b8e3724ce9e3c1192942dced38b275da27"
    },
    {
      "path": "src/auth/SessionProvider.tsx",
      "sha256": "587b4e3d2a7ed8a95cfb23e3a5184a238d02b7eac7c3512f05e5799eba01edaf"
    },
    {
      "path": "src/auth/roles.ts",
      "sha256": "11002363462521d77e8b3aee4cd17ac738fa68d95a370d1f3ef9d03f5f326bc9"
    },
    {
      "path": "src/components/organism/DemoSignInPanel/DemoSignInPanel.meta.ts",
      "sha256": "87d2a53596f6e9cd51c0e6270499388a4a9977390f7c83e5cd6f59e210917fbe"
    },
    {
      "path": "src/components/organism/DemoSignInPanel/DemoSignInPanel.tsx",
      "sha256": "5f6f25a0b1e46c57f9d4e5bcd579edd5125fa762b3aec3aca13e1cb162c1c25e"
    },
    {
      "path": "src/components/organism/EmailPreview/EmailPreview.css",
      "sha256": "c83cea608bb8e97370f5b69c7b71be333eb2cfa6cd7e784c1c4fc5b1b8d52365"
    },
    {
      "path": "src/components/organism/EmailPreview/EmailPreview.meta.ts",
      "sha256": "95c912b8a4f33502d1dad12616fc652212aec01a7feb9f0d33eb9e38ad9fcac2"
    },
    {
      "path": "src/components/organism/EmailPreview/EmailPreview.tsx",
      "sha256": "8fc1a43188193ba50ef7f6ebde2771aeff97296469155ad389260c6171e82644"
    },
    {
      "path": "src/components/organism/LaunchNotificationPreview/LaunchNotificationPreview.css",
      "sha256": "4adace92551dffdedd96fd7679f42536f4268ac7156035f995c486fb026d065b"
    },
    {
      "path": "src/components/organism/LaunchNotificationPreview/LaunchNotificationPreview.meta.ts",
      "sha256": "8065b9d5c25479315f45d474ad70ba4b6ff6a1fe476fddc52764b4fee8ec47a9"
    },
    {
      "path": "src/components/organism/LaunchNotificationPreview/LaunchNotificationPreview.tsx",
      "sha256": "7a404359d3334e9e0d98c843c256fa70ce099e6fbe75ba62cbec888b6b8b2dd7"
    },
    {
      "path": "src/data/DataContext.tsx",
      "sha256": "3a161e57f0c9548e111e8e99ec714a2ab153507ae7180db66ad95839ac324f15"
    },
    {
      "path": "src/data/MockProvider.ts",
      "sha256": "d4956fdff4c49724ec5e52ed731651d849698c10ed39b6982ef961ab4a975048"
    },
    {
      "path": "src/data/emailCatalog.ts",
      "sha256": "6db0ae79dd4138ac4a0e75db318032f2529e288416b84511b80c09d332b1dc3f"
    },
    {
      "path": "src/data/launchReceipts.ts",
      "sha256": "523d1c51c5d40aa9f76f38e48275446ec6742c5027436a7c365378361b01cb08"
    },
    {
      "path": "src/data/operationalQuotes.ts",
      "sha256": "5fb9707c151d0519e54840af911f7dcbd36bc23f6c101c16662838b08d44a3e0"
    },
    {
      "path": "src/data/receiptEmailPreview.ts",
      "sha256": "a9313b89aa1a355fc06f91004c0356466109d9d028254a12c8dc5ae6a85a0656"
    },
    {
      "path": "src/data/schema.ts",
      "sha256": "c36b53dbb55139ba16ed284fe04d61504e55dfd2143c4f599fdd814bd5f16ed0"
    },
    {
      "path": "src/data/types.ts",
      "sha256": "e61845cd49fd4bf4625deeb46b6993c8023d2a077e416c0c6cca38b2cd80b5af"
    },
    {
      "path": "src/i18n/format.ts",
      "sha256": "3115d284da4bd9ff92b11e90d49eea3b859b15cbe8c84ebf40d88dc0c476f976"
    },
    {
      "path": "src/modules/customer/auth/SignInPage.tsx",
      "sha256": "51ad5ed23c2b11449a033a1eeda44afe2c605ba600bd6e5961ee4608e5668bbe"
    },
    {
      "path": "src/modules/customer/auth/SignUpPage.tsx",
      "sha256": "bff0fc29e213a4f084a10aa163bf26326dd81f760e7b63d53d6ab4a68ad0a530"
    },
    {
      "path": "src/modules/customer/auth/customerReturn.ts",
      "sha256": "cf60c1cc94ae0488455d0b15833dd9923895a0c8d0c0912204d8bb7cca5bed48"
    },
    {
      "path": "src/modules/customer/auth/mockRegistration.ts",
      "sha256": "c30c60ee8823693dd53a3bbab7bcbe305036c6c92fa0e8703fdc515ebcf23889"
    },
    {
      "path": "src/modules/customer/auth/mockSignIn.ts",
      "sha256": "8701dbaa5941c1a88be2e90d8ba23dca66718bed8961c962d9e4552b93d77ec9"
    },
    {
      "path": "src/modules/customer/auth/signupLegal.ts",
      "sha256": "d5219918e04bf8495f61d9c558ec70d976e4c577e2c3509f19bcbaf76083685b"
    },
    {
      "path": "src/modules/customer/auth/signupValidation.ts",
      "sha256": "d134f5bd0c800f69adc43092e1259d02515c328a7a4ab62991506d29b591da06"
    },
    {
      "path": "src/modules/customer/auth/useMockSignIn.ts",
      "sha256": "2178c159632ddfb16ffc069e58adc95f4fbbab98933a7609e730a5fc15b97c29"
    },
    {
      "path": "src/modules/customer/customer.css",
      "sha256": "92c4963bb6db0dd2fedcfdfc1502f737a26181823e53d7a149d6c7bcda93df10"
    },
    {
      "path": "src/modules/customer/hooks.ts",
      "sha256": "9132b19e3f1eed143f70ebcb0e7e7bfbfdf61f12a4077118df36e7592ba853ec"
    },
    {
      "path": "src/modules/customer/index.ts",
      "sha256": "9defed5fa35881cac8a9878e57be5fcf9757db9a8bdd8183799fb51eb327e172"
    },
    {
      "path": "src/modules/customer/pages.ts",
      "sha256": "b51603b4fc29d0501f3bc01bc7b31f091da48308db87ad5c29f8de2b7a1af3b7"
    },
    {
      "path": "src/modules/customer/pages/BookedPage.tsx",
      "sha256": "5800a554997ea55f014a0aef1fc6a9eb6b373a17ca8e1c227d40dbc4ae12aede"
    },
    {
      "path": "src/modules/customer/pages/CheckoutPage.tsx",
      "sha256": "35a7d35617e457e7c18290fde68745ad4a6401ecdc30614da5cecc851c60db30"
    },
    {
      "path": "src/modules/customer/payments.ts",
      "sha256": "efb14f09e166ad42f0dd00d210fd8a37b5166ce8bcaf7bc520e540cc025a8f6e"
    },
    {
      "path": "src/modules/customer/policy.ts",
      "sha256": "d9bea19cf233f5705093a6234ca0d45fb1d5b5407306d10460d7195dc817452b"
    },
    {
      "path": "src/modules/customer/reschedule.ts",
      "sha256": "8ea3ae03ee3004c556c3d28c8fb5542c4a4d22db1219b9eea0f03ad53dea9e30"
    },
    {
      "path": "src/modules/customer/rescheduleCommand.ts",
      "sha256": "6c6775d1036f7f0bed4eae6877d5b438b78f845b6608f2b4c982e865fbc86cdf"
    },
    {
      "path": "src/modules/customer/scopedSessionRows.ts",
      "sha256": "9b334ba83d8437181db4229222677eb45c40b4d31a61fd1a705fdd918d30a95c"
    },
    {
      "path": "src/modules/customer/specs.ts",
      "sha256": "530928cd6688598ec9574e37e39b75272036deef41971d57bcc21bb190869d18"
    },
    {
      "path": "src/modules/customer/strings.ts",
      "sha256": "e26783fbcc9be2e81562dbe25daa5c93cdee7e975b2d3e2b826f149cbea8decc"
    },
    {
      "path": "src/modules/customer/useCustomerRows.ts",
      "sha256": "d4496e0f02c447bd6a17fb15d3cda469bfba8910b0ece82ac4870a3cce0add64"
    },
    {
      "path": "src/modules/customer/useScopedCustomerRead.ts",
      "sha256": "032247e233fb8cb5f2730c67abd47c3a31735d0a98cb301b470a5e226e5fd018"
    },
    {
      "path": "src/modules/customer/useTrialAssessment.ts",
      "sha256": "b83a1b553c793a743a1b6c51bb95f09a0acff60c0bb5e14802bf28f9313ccefb"
    },
    {
      "path": "src/modules/launch-notifications/Host.tsx",
      "sha256": "71b9326e9e0a8243f9921e903a9931ce4224b0344f106bf32df4f0d51182e9ee"
    },
    {
      "path": "src/modules/launch-notifications/contracts.ts",
      "sha256": "6711db707430e988a7532a502d642e7d864dd8b7ca3d2c49d77dfecc76b1f480"
    },
    {
      "path": "src/modules/launch-notifications/handoff.ts",
      "sha256": "a3aa9578af7c5f4c8e95580dfb5a3bf726770bc41ed2a6dda6ba153ec7d8db0a"
    },
    {
      "path": "src/modules/launch-notifications/index.ts",
      "sha256": "d3ad26bb3bd0522c297354051cf9ea060f0d9d38f507a5a61286040589a9ec24"
    },
    {
      "path": "src/modules/launch-notifications/preview.ts",
      "sha256": "33876f6781f2c7d451a1c3923974f0ec029e625f435d7c71df02e490960b8d48"
    },
    {
      "path": "src/modules/launch-notifications/strings.ts",
      "sha256": "5128d2b8be03133b1ca53310b68b06ab0fe1f0ae96c66bdcff5d366a56e2c9af"
    },
    {
      "path": "src/tenant/pricing.ts",
      "sha256": "d3beb9c6a5daf7e20da5a08bcac97c4d59218ab02ad70b3a65401acebe558ef0"
    },
    {
      "path": "src/tenant/tenant.ts",
      "sha256": "b6bc47f8a9eb805ac5e19cdf9f6392ee05c4911e5c2423ad149f4645e2aaf14e"
    }
  ],
  "adapterTests": [
    {
      "path": "scripts/test-launch-notifications.mjs",
      "sha256": "41400b681bc5aa4be42f7c33ee6d6e3ce4844080a012837dada501aa1d8fcb87",
      "reviewedSourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
      "verifies": "Shared read-only proof/template/queue/challenge domain checks; its in-memory fixture is not an actual MockProvider integration test."
    },
    {
      "path": "scripts/test-nt02-auth-welcome.mjs",
      "sha256": "cf28dbe7ae09454b3b69f6c880219f6686e6b201ea78b4535768d0642be6006f",
      "reviewedSourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
      "verifies": "Actual SignUpPage with real MockProvider, registration invariants and scoped welcome preview via Host."
    },
    {
      "path": "scripts/test-nt02-auth-signin.mjs",
      "sha256": "4a7475cd711d2529a3995503b08d85b8821ebc6dc6097680bb03b101debd27f7",
      "reviewedSourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
      "verifies": "Actual useMockSignIn and DemoSignInPanel current challenge lifecycle, no account recipient or DB writes."
    },
    {
      "path": "scripts/test-nt02-payment-ui.mjs",
      "sha256": "ae453e96c0a3af2cb1ebd6d06d1fb1534957d96524ec348d3bb5e91c3c84882c",
      "reviewedSourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
      "verifies": "Actual CheckoutPage and real MockProvider electronic approved/rejected, exact committed IDs, replay/rollback, source/context failures and implicit default trial refresh."
    },
    {
      "path": "scripts/test-nt02-reschedule-ui.mjs",
      "sha256": "f48ffd7fab66e1a602c382518edfab0add67018a85e2126556befbefab288425",
      "reviewedSourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
      "verifies": "Native BookedPage reschedule, actual retained financial facts, replacement/audit proof and explicit Host preview."
    },
    {
      "path": "scripts/test-nt02-reschedule-context.mjs",
      "sha256": "d5ed4a3bea5b166ab274ef959ff52bd5267046a06d7a520668d4d6338c34bce2",
      "reviewedSourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
      "verifies": "Actual MockProvider.atomic delegation and real BookedPage context invalidation, no stale publication."
    },
    {
      "path": "scripts/test-customer-registration.mjs",
      "sha256": "467309fcd32bf1e0882518964924e9dd87338cee6ede0c00075e1d5f93545511",
      "reviewedSourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
      "verifies": "Actual MockProvider registration atomicity/idempotency and existing legal/contact contracts (companion, not NT02 UI evidence)."
    },
    {
      "path": "scripts/test-reschedule-atomic.mjs",
      "sha256": "1dabb66d55080ffc51dc40a1b2dcdecaa91b809b14192fc60773ba2de264a8c9",
      "reviewedSourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
      "verifies": "Actual MockProvider original reschedule transaction and rollback invariants (companion, not NT02 preview UI evidence)."
    }
  ],
  "entities": [
    {
      "name": "users",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "email",
        "phone",
        "status",
        "locale"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "profiles",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "full_name",
        "initials",
        "photo_url",
        "birthday",
        "emergency_contact",
        "marketing_optin"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "user_roles",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "role"
      ],
      "usage": [
        "dependency",
        "command-effect"
      ]
    },
    {
      "name": "audit_log",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "actor_id",
        "action",
        "entity",
        "entity_id",
        "diff"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "consents",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "legal_document_id",
        "accepted_at"
      ],
      "usage": [
        "dependency",
        "command-effect"
      ]
    },
    {
      "name": "legal_documents",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "kind",
        "version",
        "status",
        "requires_acceptance",
        "effective_from",
        "title",
        "body_md"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "legal_acceptances",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "document_id",
        "kind",
        "version",
        "accepted_at",
        "channel"
      ],
      "usage": [
        "dependency",
        "command-effect"
      ]
    },
    {
      "name": "email_templates",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "key",
        "trigger",
        "subject",
        "body_mjml",
        "version",
        "active"
      ],
      "usage": [
        "read"
      ]
    },
    {
      "name": "payments",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "plan_id",
        "currency",
        "method",
        "provider",
        "provider_ref",
        "status",
        "frontend_receipt",
        "paid_at",
        "taken_by",
        "amount",
        "amount_paid",
        "frontend_quote"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "bookings",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "session_id",
        "status",
        "paid_with",
        "ledger_id",
        "payment_id",
        "cancelled_at",
        "rated"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "class_sessions",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "title",
        "modality_id",
        "teacher_id",
        "room_id",
        "starts_at",
        "ends_at",
        "capacity",
        "booked_count",
        "status"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "teachers",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "display_name",
        "active"
      ],
      "usage": [
        "read"
      ]
    },
    {
      "name": "invoices",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "payment_id",
        "number",
        "subtotal",
        "tax",
        "total"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "class_ledger",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "plan_id",
        "payment_id",
        "purchase_ledger_id",
        "delta",
        "reason",
        "expires_at",
        "frozen_from",
        "frozen_until"
      ],
      "usage": [
        "dependency",
        "command-effect"
      ]
    },
    {
      "name": "memberships",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "plan_id",
        "status",
        "starts_at",
        "ends_at",
        "paused_until"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "plans",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "slug",
        "family",
        "name_es",
        "name_en",
        "classes",
        "validity_days",
        "active",
        "price"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "waitlist",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "session_id",
        "position",
        "status",
        "offered_at",
        "claim_until"
      ],
      "usage": [
        "dependency",
        "command-effect"
      ]
    },
    {
      "name": "rooms",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "name",
        "capacity"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "modalities",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "slug",
        "name_es",
        "name_en",
        "tone",
        "duration_min",
        "active"
      ],
      "usage": [
        "dependency"
      ]
    }
  ],
  "mockExtensions": [
    {
      "entity": "payments",
      "field": "frontend_quote",
      "type": "json",
      "source": "src/data/operationalQuotes.ts",
      "reason": "Existing frozen fictional checkout quote outside schema inventory; backend mapping pending. No schema edit or new write added by NT02."
    }
  ],
  "pages": [
    {
      "code": "A-02",
      "route": "/auth/sign-in",
      "routeSource": "src/modules/customer/index.ts",
      "routeSpec": "canvasSpecs['A-02']",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "'A-02': ext('A-02'",
      "componentSource": "src/modules/customer/auth/SignInPage.tsx",
      "componentExport": "SignInPage",
      "viewKind": "form-preview",
      "specEntities": [
        "users",
        "user_roles",
        "audit_log"
      ],
      "views": [],
      "states": [
        "fictional-current-challenge"
      ],
      "fixtureIds": [
        "nt02-a-02-fictional-current-challenge"
      ]
    },
    {
      "code": "A-03",
      "route": "/auth/sign-up",
      "routeSource": "src/modules/customer/index.ts",
      "routeSpec": "canvasSpecs['A-03']",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "'A-03': ext('A-03'",
      "componentSource": "src/modules/customer/auth/SignUpPage.tsx",
      "componentExport": "SignUpPage",
      "viewKind": "form-preview",
      "specEntities": [
        "users",
        "profiles",
        "user_roles",
        "consents",
        "legal_documents",
        "audit_log",
        "email_templates"
      ],
      "views": [],
      "states": [
        "committed-welcome",
        "source-unavailable"
      ],
      "fixtureIds": [
        "nt02-a-03-committed-welcome",
        "nt02-a-03-source-unavailable"
      ]
    },
    {
      "code": "C-04",
      "route": "/app/checkout/:id",
      "routeSource": "src/modules/customer/index.ts",
      "routeSpec": "canvasSpecs['C-04']",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "'C-04': ext('C-04'",
      "componentSource": "src/modules/customer/pages/CheckoutPage.tsx",
      "componentExport": "CheckoutPage",
      "viewKind": "form-preview",
      "specEntities": [
        "class_sessions",
        "bookings",
        "class_ledger",
        "memberships",
        "plans",
        "payments",
        "invoices",
        "users",
        "profiles",
        "email_templates"
      ],
      "views": [],
      "states": [
        "approved-confirmation",
        "declined-preview",
        "source-unavailable"
      ],
      "fixtureIds": [
        "nt02-c-04-approved-confirmation",
        "nt02-c-04-declined-preview",
        "nt02-c-04-source-unavailable"
      ]
    },
    {
      "code": "C-08",
      "route": "/app/booking/:id",
      "routeSource": "src/modules/customer/index.ts",
      "routeSpec": "canvasSpecs['C-08']",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "'C-08': ext('C-08'",
      "componentSource": "src/modules/customer/pages/BookedPage.tsx",
      "componentExport": "BookedPage",
      "viewKind": "review-list",
      "specEntities": [
        "bookings",
        "class_sessions",
        "modalities",
        "teachers",
        "rooms",
        "class_ledger",
        "waitlist",
        "users",
        "profiles",
        "payments",
        "audit_log",
        "email_templates"
      ],
      "views": [],
      "states": [
        "verified-reschedule-summary"
      ],
      "fixtureIds": [
        "nt02-c-08-verified-reschedule-summary"
      ]
    },
    {
      "code": "C-08b",
      "route": "/app/booking/:id/change",
      "routeSource": "src/modules/customer/index.ts",
      "routeSpec": "canvasSpecs['C-08b']",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "'C-08b': ext('C-08b'",
      "componentSource": "src/modules/customer/pages/BookedPage.tsx",
      "componentExport": "BookedPage",
      "viewKind": "review-list",
      "specEntities": [
        "bookings",
        "class_sessions",
        "modalities",
        "class_ledger",
        "waitlist",
        "users",
        "profiles",
        "teachers",
        "payments",
        "audit_log",
        "email_templates"
      ],
      "views": [],
      "states": [
        "reschedule-source-proof"
      ],
      "fixtureIds": [
        "nt02-c-08b-reschedule-source-proof"
      ]
    }
  ]
}
/* cms-data:end */
) satisfies CmsFeatureContract;
