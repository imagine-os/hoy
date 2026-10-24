import type { CmsFeatureContract } from '../contracts';

// RC-03 people search only; adjacent command dependencies are not new acceptance claims.
export default (
/* cms-data:start */
{
  "id": "rc03-reception-search",
  "revision": 1,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "Only tenant-scoped people candidate reads for existing super_admin/admin/coordinator/front_desk contexts; no backend authorization or new attendance, sale, booking or payment acceptance claim.",
  "sources": [
    {
      "path": "scripts/qa-pending-payments-dev.mjs",
      "sha256": "81dfa4991a90b2990d0a34164fe747ea561fdff3391067415441d1c14eba048f"
    },
    {
      "path": "scripts/reception-search-harness.tsx",
      "sha256": "d93c6a858b5f807b73939837fe0d689f946ac2a7cd00332423c046f7187bdede"
    },
    {
      "path": "scripts/reception-search-ui-harness.tsx",
      "sha256": "cb11979bf6135f9b243f40ca2d7220a14ca1be22e7a319981b43b1a1465502e3"
    },
    {
      "path": "scripts/synthetic-admission-contact.mjs",
      "sha256": "697a6fdeaeda7ba9e5d01a02467bf04ead37b57ed128dfa41c62006646bdda85"
    },
    {
      "path": "src/auth/SessionProvider.tsx",
      "sha256": "587b4e3d2a7ed8a95cfb23e3a5184a238d02b7eac7c3512f05e5799eba01edaf"
    },
    {
      "path": "src/auth/permissions.ts",
      "sha256": "d86f9f17458e74176ec98c0f1b666b3346c69f3106dce302ae71e28bc89744b7"
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
      "path": "src/data/deskBooking.ts",
      "sha256": "ab5fc656abd8f1319090141f06ee94fc185ccdba4d736b3af066b01ec1bf3005"
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
      "path": "src/data/packages.ts",
      "sha256": "0a518e4dccc0626fe643b9ee0a8cb282c5baa3499d1c1a57a11bf291e45955cd"
    },
    {
      "path": "src/data/productCatalog.ts",
      "sha256": "2aa638dd7a252b44a5c8907efe46e57ba4f395af12614b6a162a69b6500ce8f3"
    },
    {
      "path": "src/data/receptionAttendance.ts",
      "sha256": "77750eab9cb5f411423df1ccea2d576b0799878f446f8d18dd48c63377575589"
    },
    {
      "path": "src/data/schema.ts",
      "sha256": "c36b53dbb55139ba16ed284fe04d61504e55dfd2143c4f599fdd814bd5f16ed0"
    },
    {
      "path": "src/data/sessionAdmission.ts",
      "sha256": "16d15c7d0abf2dbff7828027282987d3970d34bf63cf1cbc1ede18d3dd7ad82d"
    },
    {
      "path": "src/data/trialEligibility.ts",
      "sha256": "0c73ffb98714e9e67875c7ba7e6ee98561d8d238e697ec9180bd78aecd31347a"
    },
    {
      "path": "src/data/types.ts",
      "sha256": "e61845cd49fd4bf4625deeb46b6993c8023d2a077e416c0c6cca38b2cd80b5af"
    },
    {
      "path": "src/i18n/I18nProvider.tsx",
      "sha256": "7af011a9d1d6bebbe6900e7372440eb7776e1ef8d2155327b2cfe6c5236449df"
    },
    {
      "path": "src/i18n/format.ts",
      "sha256": "3115d284da4bd9ff92b11e90d49eea3b859b15cbe8c84ebf40d88dc0c476f976"
    },
    {
      "path": "src/modules/admin/settings.ts",
      "sha256": "8459906d19aacdd696c11439b85afbb5c3a3396e034a7d45fc34809e23ca0406"
    },
    {
      "path": "src/modules/customer/payments.ts",
      "sha256": "efb14f09e166ad42f0dd00d210fd8a37b5166ce8bcaf7bc520e540cc025a8f6e"
    },
    {
      "path": "src/modules/customer/useTrialAssessment.ts",
      "sha256": "b83a1b553c793a743a1b6c51bb95f09a0acff60c0bb5e14802bf28f9313ccefb"
    },
    {
      "path": "src/modules/quotes/hooks.ts",
      "sha256": "32b82f26f8f79a40d9ce1e972478b9e602d67b75746fab91eb5c176b2548acfe"
    },
    {
      "path": "src/modules/staff/CheckinPage.tsx",
      "sha256": "d5a031f3a7c6da004f6d237f8801c04d06f7dc7e29b0400c4674bf759d422e2b"
    },
    {
      "path": "src/modules/staff/RegisterPage.tsx",
      "sha256": "357fdb4bb10b40a3bad97905f6876b1c1d956cc3a32933aaafdef1bacf058dec"
    },
    {
      "path": "src/modules/staff/bookingContact.ts",
      "sha256": "e8c920ddc5f476724ae03cce1a4accffb6687571cb07d6217c65272195ae4e09"
    },
    {
      "path": "src/modules/staff/index.ts",
      "sha256": "151a57f3abe1d5262fd9cf742e812217f377194fa4058ce698633bb8d64ec051"
    },
    {
      "path": "src/modules/staff/maskPhone.ts",
      "sha256": "8d551106f4740ecb1eb6c63813627f26ec083572961c68adc6f39ac61bb8c1f1"
    },
    {
      "path": "src/modules/staff/people.ts",
      "sha256": "c497946aba7fdc844bc5364aed89c7fb99f85d1dd82605831d20a1d07067cef5"
    },
    {
      "path": "src/modules/staff/receptionSearch.ts",
      "sha256": "540bfbdf394e8fe381085501ccffd8112b480a521627efae407e73312e5e6cca"
    },
    {
      "path": "src/modules/staff/rooms.ts",
      "sha256": "29bd6cd0ad5ffcc0965a55083813a5077ce0eb355d5f54c67a159adc1df96811"
    },
    {
      "path": "src/modules/staff/specs.ts",
      "sha256": "ebccee5c0d1f6faef3625fccd7d21692afbb284f787cbc1761659e7e14b08449"
    },
    {
      "path": "src/modules/staff/staff.css",
      "sha256": "76b314acb2deaa7f2dac27733d9ef2ea50035d9953fa043f32746406dcdf35fb"
    },
    {
      "path": "src/modules/staff/strings.ts",
      "sha256": "491a3130339400f2bce31d3b6ae8f6b789bde9a7829ad6136a88c8b96eba3c6f"
    },
    {
      "path": "src/modules/staff/useReceptionPeople.ts",
      "sha256": "9953c4721855e80c0f4ea3fe2247e7008ddbea941db1d2d86b057c571ef47fd3"
    },
    {
      "path": "src/modules/website/hooks.ts",
      "sha256": "bd5cc409f3fffcc46b5a346bdc8ff58453af10c6b046104a483869eb86e51852"
    },
    {
      "path": "src/tenant/tenant.ts",
      "sha256": "b6bc47f8a9eb805ac5e19cdf9f6392ee05c4911e5c2423ad149f4645e2aaf14e"
    }
  ],
  "adapterTests": [
    {
      "path": "scripts/test-reception-search.mjs",
      "sha256": "29dd6a5acee2c1a925b4ad5ea643643822ae135d3715f10a4718e960a7bed7ba",
      "verifies": "Pure matching and tenant-scoped joins: accent/case, phone punctuation, mixed-text refusal, foreign-ID collisions, absent scope/role, immutable source and all five read failures.",
      "reviewedSourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
    },
    {
      "path": "scripts/test-reception-search-states.mjs",
      "sha256": "6d5ad68b5a49172d098ba83c56c2b3164bfe48e4da59e3b5d21e53b578dcb2f0",
      "verifies": "Actual useReceptionPeople with MockProvider held reads: tenant/role invalidation, latest subscription, failure recovery, unmount and queued post-cleanup callbacks issuing no stale reads. Development harness only.",
      "reviewedSourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
    },
    {
      "path": "scripts/test-reception-search-recovery.mjs",
      "sha256": "53787bd7e96d2bacec44f4c97b19ec744f170c3831098540ca4d8cab1fcf64b2",
      "verifies": "Actual S-02/S-04 pages and MockProvider read-failure harness: loading, contained error/native retry and no stale candidate action. Development harness only.",
      "reviewedSourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
    },
    {
      "path": "scripts/test-reception-search-ui.mjs",
      "sha256": "83751c29c3e29fe5d9cc2435b4c75782af8b54fcbf081477bd25cea3162ac833",
      "verifies": "Compiled full application candidate matching/identity on S-02/S-04 across EN/ES at320/390/1280, truthful no-match guidance, role checks and no search-write assertions. Execution status is recorded separately.",
      "reviewedSourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
    },
    {
      "path": "scripts/test-reception-attendance.mjs",
      "sha256": "9fc140945ce9cd935778c27f046077c28cd777a7add12054e064e7c2719e29e2",
      "verifies": "Unchanged actual MockProvider attendance companion regression: validates the existing command boundary invoked by S-02 Enter, atomic rollback/replay and financial invariance. No new attendance policy, backend or execution-status claim.",
      "reviewedSourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
    },
    {
      "path": "scripts/test-reception-search-enter-ui.mjs",
      "sha256": "33710f1597f543725a637151b30936642d9637c3fb31f27dccd10b68faef15e2",
      "verifies": "Twenty EN/ES390/1280 cases: compiled native ready Enter roster/walk-in selection and same-person replay; DEV actual MockProvider command delegation tests busy/role/read loading/error/retry fences. Uses existing attendance/booking policy, not a replacement writer or new backend guarantee.",
      "reviewedSourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
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
        "status"
      ],
      "usage": [
        "read"
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
        "birthday",
        "notes",
        "marketing_optin",
        "whatsapp_verified"
      ],
      "usage": [
        "read"
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
        "read"
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
        "status"
      ],
      "usage": [
        "read"
      ]
    },
    {
      "name": "plans",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "name_es",
        "name_en",
        "price",
        "classes",
        "active"
      ],
      "usage": [
        "read"
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
        "starts_at",
        "ends_at",
        "status",
        "capacity",
        "booked_count",
        "template_id",
        "modality_id",
        "teacher_id"
      ],
      "usage": [
        "dependency"
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
        "checked_in_at"
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
        "status"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "teachers",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "display_name",
        "active"
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
        "name_es",
        "name_en",
        "active"
      ],
      "usage": [
        "dependency"
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
        "dependency"
      ]
    },
    {
      "name": "tenants",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "name",
        "settings"
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
        "dependency"
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
        "amount",
        "status"
      ],
      "usage": [
        "dependency"
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
        "dependency"
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
      "name": "message_log",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "channel",
        "direction"
      ],
      "usage": [
        "dependency"
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
      "name": "space_bookings",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "room_id",
        "starts_at",
        "ends_at",
        "status"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "class_templates",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "active"
      ],
      "usage": [
        "dependency"
      ]
    }
  ],
  "mockExtensions": [],
  "pages": [
    {
      "code": "S-02",
      "route": "/staff/checkin",
      "routeSource": "src/modules/staff/index.ts",
      "specSource": "src/modules/staff/specs.ts",
      "specAnchor": "export const S02 =",
      "routeSpec": "S02",
      "componentSource": "src/modules/staff/CheckinPage.tsx",
      "componentExport": "CheckinPage",
      "viewKind": "review-list",
      "specEntities": [
        "class_sessions",
        "bookings",
        "waitlist",
        "users",
        "profiles",
        "memberships",
        "plans",
        "teachers",
        "modalities",
        "audit_log",
        "tenants"
      ],
      "views": [],
      "states": [
        "ready",
        "loading",
        "read-error",
        "no-matches",
        "disabled"
      ],
      "fixtureIds": [
        "rc03-s-02-ready",
        "rc03-s-02-loading",
        "rc03-s-02-read-error",
        "rc03-s-02-no-matches",
        "rc03-s-02-disabled"
      ]
    },
    {
      "code": "S-04",
      "route": "/staff/register",
      "routeSource": "src/modules/staff/index.ts",
      "specSource": "src/modules/staff/specs.ts",
      "specAnchor": "export const S04 =",
      "routeSpec": "S04",
      "componentSource": "src/modules/staff/RegisterPage.tsx",
      "componentExport": "RegisterPage",
      "viewKind": "form-preview",
      "specEntities": [
        "users",
        "profiles",
        "user_roles",
        "consents",
        "payments",
        "invoices",
        "memberships",
        "class_ledger",
        "bookings",
        "class_sessions",
        "message_log",
        "audit_log",
        "tenants"
      ],
      "views": [],
      "states": [
        "ready",
        "loading",
        "read-error",
        "no-matches",
        "disabled"
      ],
      "fixtureIds": [
        "rc03-s-04-ready",
        "rc03-s-04-loading",
        "rc03-s-04-read-error",
        "rc03-s-04-no-matches",
        "rc03-s-04-disabled"
      ]
    }
  ]
}
/* cms-data:end */
) satisfies CmsFeatureContract;
