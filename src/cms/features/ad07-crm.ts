import type { CmsFeatureContract } from '../contracts';

// AD-07 CRM list inventory; test references describe coverage, not execution status.
export default (
/* cms-data:start */
{
  "id": "ad07-crm",
  "revision": 1,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "Existing M06 route roles and tenant-local provider; current list read lifecycle only. No backend authorization, detail command or cross-device claim.",
  "sources": [
    {
      "path": "scripts/test-ad07/controlled-provider.ts",
      "sha256": "eed9fe5387bc299f6ab8b28aba08f0f175e3619ca10717db286e3b995f204669"
    },
    {
      "path": "scripts/test-ad07/index.html",
      "sha256": "ec7701ae1c0d6b0920caa395796f2841f75ff9e912f64644cc7f3a9be4da0e9f"
    },
    {
      "path": "scripts/test-ad07/start-server.mjs",
      "sha256": "ce57737d345adf73a0d664ccfbf4abeb73890a5251c498cde61d013db83a56b6"
    },
    {
      "path": "scripts/test-ad07/test-common.mjs",
      "sha256": "01a0172d5c3a27f1f1e7889310478b60c09a5aee94bc4b91c403588345b3a231"
    },
    {
      "path": "scripts/test-ad07/use-table-lifecycle-harness.tsx",
      "sha256": "996d6ce7b5d63299a14276c8d83793cd7b5b0d2ffb6b9911bebec5311d66874b"
    },
    {
      "path": "src/auth/SessionProvider.tsx",
      "sha256": "587b4e3d2a7ed8a95cfb23e3a5184a238d02b7eac7c3512f05e5799eba01edaf"
    },
    {
      "path": "src/components/organism/DataTable/DataTable.css",
      "sha256": "bee0600caa204a137dc1a5c3e39932a419c50cc0619b35ea753739e02942f54c"
    },
    {
      "path": "src/components/organism/DataTable/DataTable.tsx",
      "sha256": "6927411e7d3c87c4243312eacf9b1b20774137ee00ba47351dbc7958847aea7b"
    },
    {
      "path": "src/data/DataContext.tsx",
      "sha256": "aa7f2f11b3a1f3b539449967d3e4c0ffe993f013a48a18835d40f2fd021897f8"
    },
    {
      "path": "src/data/MockProvider.ts",
      "sha256": "d4956fdff4c49724ec5e52ed731651d849698c10ed39b6982ef961ab4a975048"
    },
    {
      "path": "src/data/analytics.ts",
      "sha256": "81b4be1d4afaacebffe57be84487d66ebda22c9d7382eeaa87ae507cee3541b6"
    },
    {
      "path": "src/data/comms.ts",
      "sha256": "ea3168c3b7549e2468e19c5f9bddbb78944d0e6395456fbe15d86b6a4b2aea83"
    },
    {
      "path": "src/data/packages.ts",
      "sha256": "0a518e4dccc0626fe643b9ee0a8cb282c5baa3499d1c1a57a11bf291e45955cd"
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
      "path": "src/data/useAnalytics.ts",
      "sha256": "6291220b1e7446f1eba3eb446f67414f96b01c262e543ca5ef82c55426963677"
    },
    {
      "path": "src/data/vouchers.ts",
      "sha256": "539e5e400952b9ed2bd277b4ccb3145e24c67d91db7bdea72184030b8b5b08ff"
    },
    {
      "path": "src/design/tokens.css",
      "sha256": "db343c534975d3dbda9d06923dc025b28be8620b1da018958285c1bbf8dca448"
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
      "path": "src/modules/admin/CrmPage.tsx",
      "sha256": "79349ec2d4cfe0ce516e9330806a0cf7fb08771b8dde0984e3ea24816f083afa"
    },
    {
      "path": "src/modules/admin/MemberPage.tsx",
      "sha256": "a2c258989b255312cbe39b858ee97c432a71a8947e7290253dcbed404595605a"
    },
    {
      "path": "src/modules/admin/admin.css",
      "sha256": "020ff3ec840565461b282b4645fed4f54e6fe8249a50ac2aeeda57322eedc303"
    },
    {
      "path": "src/modules/admin/index.ts",
      "sha256": "b1009f7886f179622580e0a7be69d8a87e8cd9ff9f3be6809a86d5620949486e"
    },
    {
      "path": "src/modules/admin/specs.ts",
      "sha256": "310e41c163ee0f669cb36fa6246c65e06cf22ca3ed593917042849cc8dfdbd20"
    },
    {
      "path": "src/modules/admin/strings.ts",
      "sha256": "899268581e49663d010b3648a483884229c9f95bda494630a55bc1b4dce245e3"
    },
    {
      "path": "src/modules/staff/audit.ts",
      "sha256": "9ec096be3152e06d64a084803f5a063fc946252c1d4f07f18920c2443ca3abc7"
    },
    {
      "path": "src/modules/staff/maskPhone.ts",
      "sha256": "8d551106f4740ecb1eb6c63813627f26ec083572961c68adc6f39ac61bb8c1f1"
    },
    {
      "path": "src/modules/staff/people.ts",
      "sha256": "bb7f396d6911a822dc61ecfd30ee2acb541dccb3a582eaa6e831791c12704d19"
    },
    {
      "path": "src/styles/global.css",
      "sha256": "c3c04fce7bce640996b5102a0c0d603bd7134f4f85b51fb3059ef4268e0f9cb3"
    }
  ],
  "adapterTests": [
    {
      "path": "scripts/test-crm-balances-ui.mjs",
      "sha256": "fab63fdcea2fbcb19af80637d386f1bdddbac843966e5e9416296f48c9801b31",
      "verifies": "Existing full application MockProvider regression: displayed package balance/expiry, claimed voucher identity, detail links, empty search and EN/ES responsive rendering. This legacy script alone does not verify deferred-read lifecycle states.",
      "reviewedSourceDigest": "0abeb0a3474107321ab3310fe506fa231a7831d33713db80ac37911d404d132d"
    },
    {
      "path": "scripts/test-ad07/test-use-table-lifecycle.mjs",
      "sha256": "d67940f9661755a4d62f05bf85af1b06d077c09dd412741d21ca36ad9cb738a0",
      "verifies": "Actual useTable and existing SessionProvider under a controlled read-only DataProvider: latest-result wins, contained rejection and retry, provider/query/table changes, cleanup, initial synchronous peek and deferred retry after failure. Not a compiled full App or backend authorization test.",
      "reviewedSourceDigest": "0abeb0a3474107321ab3310fe506fa231a7831d33713db80ac37911d404d132d"
    },
    {
      "path": "scripts/test-ad07/test-ad07-crm-lifecycle.mjs",
      "sha256": "5d18f562d06603255ead1aacc43de0bb933573b8270b079e0f4138e59e8fab64",
      "verifies": "Actual CrmPage/usePeople/stats under controlled asynchronous reads for all nine required tables: loading, error/native retry, latest result/provider fences, package/voucher identity, legacy stats Map, EN/ES mobile/desktop search and long-name readability including native table scroll. Not full detail-command or backend acceptance.",
      "reviewedSourceDigest": "0abeb0a3474107321ab3310fe506fa231a7831d33713db80ac37911d404d132d"
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
        "classes",
        "active"
      ],
      "usage": [
        "read"
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
        "status",
        "checked_in_at"
      ],
      "usage": [
        "read"
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
        "status"
      ],
      "usage": [
        "read"
      ]
    },
    {
      "name": "vouchers",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "claimedBy",
        "balance",
        "status"
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
        "starts_at"
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
        "direction",
        "read_at"
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
      "name": "practice_goals",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "active",
        "target",
        "starts_on"
      ],
      "usage": [
        "dependency"
      ]
    }
  ],
  "mockExtensions": [],
  "pages": [
    {
      "code": "M-06",
      "route": "/admin/crm",
      "routeSource": "src/modules/admin/index.ts",
      "specSource": "src/modules/admin/specs.ts",
      "specAnchor": "export const M06 =",
      "routeSpec": "M06",
      "componentSource": "src/modules/admin/CrmPage.tsx",
      "componentExport": "CrmPage",
      "viewKind": "data-table",
      "specEntities": [
        "users",
        "profiles",
        "memberships",
        "plans",
        "bookings",
        "class_sessions",
        "payments",
        "class_ledger",
        "vouchers",
        "message_log",
        "consents",
        "audit_log",
        "practice_goals"
      ],
      "views": [],
      "states": [
        "ready",
        "loading",
        "read-error",
        "empty-filter"
      ],
      "fixtureIds": [
        "ad07-m06-ready",
        "ad07-m06-loading",
        "ad07-m06-read-error",
        "ad07-m06-empty-filter"
      ]
    }
  ]
}
/* cms-data:end */
) satisfies CmsFeatureContract;
