import type { CmsFeatureContract } from '../contracts';

// Reviewed frontend inventory. Backend entity/field mapping remains pending.
export default (
/* cms-data:start */
{
  "id": "gift",
  "revision": 2,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "Tenant and current actor/role context; UI scope is not backend authorization.",
  "sources": [
    {
      "path": "scripts/retained-monetary-gift-fixture.mjs",
      "sha256": "8a16e36403eaea196d4e1f69ff36bbcef71ecc51b274975ed1b4bdc079cd9f60"
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
      "path": "src/data/productCatalog.ts",
      "sha256": "2aa638dd7a252b44a5c8907efe46e57ba4f395af12614b6a162a69b6500ce8f3"
    },
    {
      "path": "src/data/types.ts",
      "sha256": "e61845cd49fd4bf4625deeb46b6993c8023d2a077e416c0c6cca38b2cd80b5af"
    },
    {
      "path": "src/modules/customer/giftPurchase.ts",
      "sha256": "bd21793e0a8a5a892540074278ec1135484f1fb0cbe90586525abd58d43da704"
    },
    {
      "path": "src/modules/customer/index.ts",
      "sha256": "9defed5fa35881cac8a9878e57be5fcf9757db9a8bdd8183799fb51eb327e172"
    },
    {
      "path": "src/modules/customer/pages/GiftPage.tsx",
      "sha256": "14fe0be68585a7b93d34dc0b6a710a91e6f0001017002524bd8f36d5fdff7e5a"
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
      "path": "src/modules/customer/retainedMonetaryGift.ts",
      "sha256": "dc5250adf2e705b1eb4162e95a9eff0622ede0728030be173faf9663a0f6f1e4"
    },
    {
      "path": "src/modules/customer/specs.ts",
      "sha256": "dbfd456a0208724b63fc109281ebab61aeb521e213f69a31dceda8c5d03b6e63"
    },
    {
      "path": "src/modules/customer/strings.ts",
      "sha256": "e26783fbcc9be2e81562dbe25daa5c93cdee7e975b2d3e2b826f149cbea8decc"
    },
    {
      "path": "src/modules/monetary-gift/index.ts",
      "sha256": "a557b08b130e5dda2310287baffc0fab0eaac1b1e72562beeca934f953bbdc87"
    },
    {
      "path": "src/modules/quotes/hooks.ts",
      "sha256": "32b82f26f8f79a40d9ce1e972478b9e602d67b75746fab91eb5c176b2548acfe"
    }
  ],
  "adapterTests": [
    {
      "path": "scripts/test-retained-monetary-gift.mjs",
      "sha256": "77eaa76343824e11386a762851358d5a31631eabbb39be449433f7f09451c523",
      "verifies": "Actual MockProvider journal: replay, owner context, storage failure and exact saved outcome.",
      "reviewedSourceDigest": "f4a5584100473dc640ca64148927157689926530933d6fef64be4f12d27cb7ae"
    },
    {
      "path": "scripts/test-retained-monetary-gift-native.mjs",
      "sha256": "b5d246878c2173e3d3a47bb33dbff94937e5be4f9649ba64fffd698d612b6011",
      "verifies": "Browser-native reconnect/recovery acceptance; run by existing feature QA.",
      "reviewedSourceDigest": "f4a5584100473dc640ca64148927157689926530933d6fef64be4f12d27cb7ae"
    }
  ],
  "entities": [
    {
      "name": "gift_cards",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "code",
        "buyer_user_id",
        "recipient_name",
        "recipient_contact",
        "amount",
        "balance",
        "deliver_at",
        "redeemed_by",
        "status",
        "frontend_quote"
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
    }
  ],
  "mockExtensions": [
    {
      "entity": "gift_cards",
      "field": "frontend_quote",
      "type": "json",
      "source": "src/modules/customer/retainedMonetaryGift.ts",
      "reason": "Explicit browser-only runtime extension; absent from the draft table schema. Backend mapping pending."
    },
    {
      "entity": "gift_cards",
      "field": "status",
      "type": "enum",
      "source": "src/modules/customer/retainedMonetaryGift.ts",
      "reason": "Explicit browser-only runtime extension; absent from the draft table schema. Backend mapping pending.",
      "enumValues": [
        "draft"
      ]
    },
    {
      "entity": "payments",
      "field": "frontend_quote",
      "type": "json",
      "source": "src/modules/customer/payments.ts",
      "reason": "Explicit browser-only runtime extension; absent from the draft table schema. Backend mapping pending."
    }
  ],
  "pages": [
    {
      "code": "C-17",
      "route": "/app/gift",
      "routeSource": "src/modules/customer/index.ts",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "'C-17': ext(",
      "routeSpec": "C-17",
      "componentSource": "src/modules/customer/pages/GiftPage.tsx",
      "componentExport": "GiftPage",
      "viewKind": "form-preview",
      "specEntities": [
        "gift_cards",
        "payments",
        "audit_log"
      ],
      "views": [],
      "states": [
        "pending",
        "approved",
        "declined"
      ],
      "fixtureIds": [
        "gift-c-17-pending",
        "gift-c-17-approved",
        "gift-c-17-declined"
      ]
    }
  ]
}
/* cms-data:end */
) satisfies CmsFeatureContract;
