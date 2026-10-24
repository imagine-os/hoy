import type { CmsFeatureContract } from '../contracts';

// Reviewed frontend inventory. Backend entity/field mapping remains pending.
export default (
/* cms-data:start */
{
  "id": "transfers",
  "revision": 1,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "Tenant and current actor/role context; UI scope is not backend authorization.",
  "sources": [
    {
      "path": "scripts/synthetic-transfer-review-image.mjs",
      "sha256": "bb4e96e50df6d6b630e6256e1e11fa2d8c2353da5f885436cade97751654bfb8"
    },
    {
      "path": "src/components/organism/DataTable/DataTable.tsx",
      "sha256": "6927411e7d3c87c4243312eacf9b1b20774137ee00ba47351dbc7958847aea7b"
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
      "path": "src/data/bookingContact.ts",
      "sha256": "1225c53d18134aa29e830bd79e76ba2765d6838e3e2b10736b4ed78bc689c8fb"
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
      "path": "src/data/productCatalog.ts",
      "sha256": "2aa638dd7a252b44a5c8907efe46e57ba4f395af12614b6a162a69b6500ce8f3"
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
      "path": "src/modules/admin/TablesPage.tsx",
      "sha256": "ca5065a8368a44a8c204303d1dafa7cbff694b5928dfb709558e005af2ec278b"
    },
    {
      "path": "src/modules/admin/index.ts",
      "sha256": "b1009f7886f179622580e0a7be69d8a87e8cd9ff9f3be6809a86d5620949486e"
    },
    {
      "path": "src/modules/admin/specs.ts",
      "sha256": "f13264e281830d9be3e2fe842ad7d3ddd53884a486e963fb60b7558b40f6b9ca"
    },
    {
      "path": "src/modules/admin/tables/Views.tsx",
      "sha256": "668cefebdda56915be0a7347cd315ec123cbf84c7084e15df66616fad98c88fd"
    },
    {
      "path": "src/modules/admin/tables/model.ts",
      "sha256": "41678545acd0d404227669d5844c3c03eb82892fbc0bab49ba2a34052678c007"
    },
    {
      "path": "src/modules/admin/tables/prefs.ts",
      "sha256": "61331980dfb7bc7baf9f3040afb493f161d1a7a8b41e4e4d3b96622eced5b50b"
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
      "path": "src/modules/quotes/hooks.ts",
      "sha256": "32b82f26f8f79a40d9ce1e972478b9e602d67b75746fab91eb5c176b2548acfe"
    },
    {
      "path": "src/modules/transfers/TransferQueuePage.tsx",
      "sha256": "75bfb9af4c7de5669ab1309181550adbe9984968bcd89a58a422cb70bf4b182a"
    },
    {
      "path": "src/modules/transfers/deskSettlement.ts",
      "sha256": "ee1a42af7405bd928f0c4eb75ee388df0d6385abbfd535eb0c1da401869e066c"
    },
    {
      "path": "src/modules/transfers/index.ts",
      "sha256": "0999deefd53c22cb3dbf16cbb344bb50c87ca3f8adc4a3e4c7a812d97ea69890"
    },
    {
      "path": "src/modules/transfers/pendingQueue.ts",
      "sha256": "d4a8075be659c12d752e85a4f372c7c339483c709c21fd03b3e6e3fa6c74c976"
    },
    {
      "path": "src/modules/transfers/receiptAlert.ts",
      "sha256": "53d0679faa53f63ba38b1fbe6e486bde22cebdd237af42fe5fe93b1e0b883a6b"
    },
    {
      "path": "src/modules/transfers/receipts.ts",
      "sha256": "1facbf26efad511f8dec5f20c1508ac4c7b0e66762437328a7667201dc743d42"
    },
    {
      "path": "src/modules/transfers/specs.ts",
      "sha256": "0452171d6c5cfa5cb42b48ee31671001d268ce8eb38f81eca3c31593d6f9174e"
    },
    {
      "path": "src/modules/transfers/strings.ts",
      "sha256": "3c1596e5efa262d50916f65434c6146fc730f24d9856849f47c342b19fde2969"
    }
  ],
  "adapterTests": [
    {
      "path": "scripts/test-transfer-review-evidence.mjs",
      "sha256": "ab5df6136cb35cdaa15e79b8669dd1fe1db2c80fea61b9afe4e8244bc4ba3149",
      "verifies": "Actual MockProvider review evidence identity, bytes, stale proof, scope and transaction refusal.",
      "reviewedSourceDigest": "ae77133d8d9891ab3ff112c1394767f8fd698fd841e7d21310e3aadfcc5193af"
    },
    {
      "path": "scripts/test-transfer-receipts.mjs",
      "sha256": "099ec7dcf852d15c1bb42c8ca4c680f214d7ee980092eb05adf5b489b6cb7c90",
      "verifies": "Actual MockProvider transfer submission/review, atomic failures and replay.",
      "reviewedSourceDigest": "ae77133d8d9891ab3ff112c1394767f8fd698fd841e7d21310e3aadfcc5193af"
    },
    {
      "path": "scripts/test-transfer-review-evidence-native.mjs",
      "sha256": "fa6ba65ab2d34e7b84072e59c9cb87e479ffd81e925b5cfb7286b51e15144e10",
      "verifies": "Browser-native exact evidence review; run by existing feature QA.",
      "reviewedSourceDigest": "ae77133d8d9891ab3ff112c1394767f8fd698fd841e7d21310e3aadfcc5193af"
    },
    {
      "path": "scripts/test-sensitive-audit-ui.mjs",
      "sha256": "378c07b34ce7cbf58661e415f39a2887f90d5162522efc7d8d3f894c289339f5",
      "verifies": "Compiled front-desk approval and rejection audit receipts with a genuine positive PNG fixture; actor/time, private-note export fencing and read-only sensitive tables.",
      "reviewedSourceDigest": "ae77133d8d9891ab3ff112c1394767f8fd698fd841e7d21310e3aadfcc5193af"
    },
    {
      "path": "scripts/test-transfer-review-evidence-ui.mjs",
      "sha256": "9053ee8ee76e13a442cdfb8a84edba342fc7689ba433861145da88750d971597",
      "verifies": "Actual browser receipt evidence and actor-context matrix; frozen run rejects Vite reloads and records navigation, WebSocket and failure-phase diagnostics without retrying failed actions.",
      "reviewedSourceDigest": "ae77133d8d9891ab3ff112c1394767f8fd698fd841e7d21310e3aadfcc5193af"
    }
  ],
  "entities": [
    {
      "name": "transfer_receipts",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "payment_id",
        "status",
        "file_name",
        "mime_type",
        "byte_size",
        "image_data_url",
        "reviewed_by",
        "reviewed_at",
        "review_reason",
        "amount_received"
      ],
      "usage": [
        "read",
        "command-effect"
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
        "amount_paid",
        "currency",
        "method",
        "provider",
        "provider_ref",
        "status",
        "paid_at",
        "frontend_quote",
        "frontend_receipt"
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
        "full_name"
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
        "name_es",
        "name_en",
        "price",
        "classes",
        "active"
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
        "frozen_until",
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
        "payment_id"
      ],
      "usage": [
        "read",
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
      "name": "gift_purchase_intents",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "paymentId",
        "buyerId",
        "recipientEmail",
        "quote",
        "voucherId"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "gift_purchase_requests",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "actorId",
        "type",
        "fingerprint",
        "result"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "vouchers",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "code",
        "status"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "table_views",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "table_name",
        "name",
        "kind",
        "config",
        "is_default",
        "shared",
        "created_by"
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
        "name"
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
      "source": "src/modules/customer/payments.ts",
      "reason": "Explicit browser-only runtime extension; absent from the draft table schema. Backend mapping pending."
    },
    {
      "entity": "class_ledger",
      "field": "frontend_quote",
      "type": "json",
      "source": "src/modules/customer/payments.ts",
      "reason": "Explicit browser-only runtime extension; absent from the draft table schema. Backend mapping pending."
    }
  ],
  "pages": [
    {
      "code": "S-09",
      "route": "/staff/transfers",
      "routeSource": "src/modules/transfers/index.ts",
      "specSource": "src/modules/transfers/specs.ts",
      "specAnchor": "export const transferSpec=",
      "routeSpec": "transferSpec",
      "componentSource": "src/modules/transfers/TransferQueuePage.tsx",
      "componentExport": "TransferQueuePage",
      "viewKind": "review-list",
      "specEntities": [
        "transfer_receipts",
        "payments",
        "profiles",
        "plans",
        "class_ledger",
        "bookings",
        "audit_log",
        "gift_purchase_intents",
        "gift_purchase_requests",
        "vouchers"
      ],
      "views": [],
      "states": [
        "pending",
        "approved",
        "rejected"
      ],
      "fixtureIds": [
        "transfers-s-09-pending",
        "transfers-s-09-approved",
        "transfers-s-09-rejected"
      ]
    },
    {
      "code": "M-03",
      "route": "/admin/tables/:table",
      "routeSource": "src/modules/admin/index.ts",
      "specSource": "src/modules/admin/specs.ts",
      "specAnchor": "export const M03 =",
      "routeSpec": "M03",
      "componentSource": "src/modules/admin/TablesPage.tsx",
      "componentExport": "TablesPage",
      "viewKind": "table-tool",
      "specEntities": [
        "table_views",
        "any table in src/data/schema.ts (tableRegistry)",
        "tenants"
      ],
      "views": [
        {
          "key": "payment-evidence",
          "entity": "payments",
          "kind": "grid",
          "config": {}
        }
      ],
      "states": [
        "pending"
      ],
      "fixtureIds": [
        "transfers-m-03-pending"
      ]
    }
  ]
}
/* cms-data:end */
) satisfies CmsFeatureContract;
