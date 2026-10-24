import type { CmsFeatureContract } from '../contracts';

// Reviewed frontend inventory. Backend entity/field mapping remains pending.
export default (
/* cms-data:start */
{
  "id": "classes",
  "revision": 1,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "Tenant and current actor/role context; UI scope is not backend authorization.",
  "sources": [
    {
      "path": "scripts/retained-class-purchase-harness.tsx",
      "sha256": "1395ec9d385889f1b6884cf931016407915ef7b860bf3bb7716291e996b3eec8"
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
      "path": "src/data/retainedClassPurchase.ts",
      "sha256": "416dbdb733f8f4c152c64a15b05a468c287fec19ecc997bee2cd0cbad00d8551"
    },
    {
      "path": "src/data/types.ts",
      "sha256": "e61845cd49fd4bf4625deeb46b6993c8023d2a077e416c0c6cca38b2cd80b5af"
    },
    {
      "path": "src/modules/classSchedule/studioCancellation.ts",
      "sha256": "1af732798af3efb391770f474984686034d5d0042569e24a72658df7587e5cc5"
    },
    {
      "path": "src/modules/customer/customerCancellation.ts",
      "sha256": "0759003cb5608805a4c3830bd3c6a17ab5a4695da5f85058f98af6bbd57e981e"
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
      "path": "src/modules/customer/pages/PassesPage.tsx",
      "sha256": "006a5362a3f27df960d434e48fb6fdf6f7b3b07807973e3b7d2f1e9754fa9c63"
    },
    {
      "path": "src/modules/customer/pages/PlansPage.tsx",
      "sha256": "fe3167b8675b7874f382cfd7670436acae2986c04d3804fe3bbd79653305c896"
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
      "path": "src/modules/customer/specs.ts",
      "sha256": "994aa3b78cbaa76bbeca6c7c3da6ed001f6569f0adb64acbfdd3c7f9dc499705"
    },
    {
      "path": "src/modules/customer/strings.ts",
      "sha256": "63551d693f3c11082950910a0b7c276e4f4de92b45e09af79c8a35d32494e204"
    },
    {
      "path": "src/modules/customer/useRetainedClassPurchase.ts",
      "sha256": "7c8dd73e570d1e81d57699f9ce0ed9398f488f3849ab285a4cb1aedf5452c433"
    },
    {
      "path": "src/modules/quotes/hooks.ts",
      "sha256": "32b82f26f8f79a40d9ce1e972478b9e602d67b75746fab91eb5c176b2548acfe"
    }
  ],
  "adapterTests": [
    {
      "path": "scripts/test-retained-class-purchase.mjs",
      "sha256": "48d5eeae10e28b0cb4359b524227d1cde9ffefd752c0bf55467ffd8068f0982f",
      "verifies": "Actual MockProvider payment/grant transaction: retained intent, replay, faults and expiry.",
      "reviewedSourceDigest": "f5dcd05eda14e2ef134e6d8f358868f18a46dafb893261d63d55cce7b77d5feb"
    },
    {
      "path": "scripts/test-retained-class-active-owner-native.mjs",
      "sha256": "cf3e74ce5584abb6484460022e16edaf55377652743443dca4af83ec0b37dc31",
      "verifies": "Browser-native active owner invalidation; run by existing feature QA.",
      "reviewedSourceDigest": "f5dcd05eda14e2ef134e6d8f358868f18a46dafb893261d63d55cce7b77d5feb"
    }
  ],
  "entities": [
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
        "total",
        "issued_at"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "users",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "email",
        "status"
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
      "code": "C-06",
      "route": "/app/plans",
      "routeSource": "src/modules/customer/index.ts",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "'C-06': ext(",
      "routeSpec": "C-06",
      "componentSource": "src/modules/customer/pages/PlansPage.tsx",
      "componentExport": "PlansPage",
      "viewKind": "cards",
      "specEntities": [
        "plans",
        "class_ledger",
        "payments"
      ],
      "views": [],
      "states": [
        "pending",
        "approved",
        "declined"
      ],
      "fixtureIds": [
        "classes-c-06-pending",
        "classes-c-06-approved",
        "classes-c-06-declined"
      ]
    },
    {
      "code": "C-07b",
      "route": "/app/classes",
      "routeSource": "src/modules/customer/index.ts",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "'C-07b': ext(",
      "routeSpec": "C-07b",
      "componentSource": "src/modules/customer/pages/PassesPage.tsx",
      "componentExport": "ClassesPage",
      "viewKind": "summary-ledger-list",
      "specEntities": [
        "class_ledger",
        "plans",
        "payments",
        "bookings"
      ],
      "views": [
        {
          "key": "ledger",
          "entity": "class_ledger",
          "kind": "list",
          "config": {
            "sorts": [
              {
                "column": "created_at",
                "dir": "desc"
              }
            ]
          }
        }
      ],
      "states": [
        "pending",
        "approved",
        "declined"
      ],
      "fixtureIds": [
        "classes-c-07b-pending",
        "classes-c-07b-approved",
        "classes-c-07b-declined"
      ]
    }
  ]
}
/* cms-data:end */
) satisfies CmsFeatureContract;
