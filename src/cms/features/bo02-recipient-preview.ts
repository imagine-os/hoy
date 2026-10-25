import type { CmsFeatureContract } from '../contracts';

// Bounded S-09 inventory. Fingerprints require manual source/test/fixture review when they drift.
const feature: CmsFeatureContract =
/* cms-data:start */
{
  "id": "bo02-recipient-preview",
  "revision": 1,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "S-09 queue keeps its existing staff route roles. Recipient preview requires the current active tenant-scoped admin/super_admin who owns the exact successful approval command. Eight proof entities (users, user_roles, payments, gift_purchase_intents, gift_purchase_requests, vouchers, voucher_events, audit_log) are read-only for this preview; no persistent writes, notification/outbox, recipient account or recipient locale inference. Existing approval effects remain in the protected mock command. Backend authorization/mapping pending; local-events describes the existing browser provider only, not live backend subscriptions.",
  "sources": [
    {
      "path": "scripts/session-admission-fixture.mjs",
      "sha256": "fc8212a31f330607823852353ea5d16686ca1e791b523a04290c7381139f44e4"
    },
    {
      "path": "scripts/voucher-recipient-preview-harness.tsx",
      "sha256": "b87ea417e601e89e2fcad23c277625316ee01aef9dce7413c3c7466ad6efdfe6"
    },
    {
      "path": "src/auth/SessionProvider.tsx",
      "sha256": "587b4e3d2a7ed8a95cfb23e3a5184a238d02b7eac7c3512f05e5799eba01edaf"
    },
    {
      "path": "src/components/organism/EmailPreview/EmailPreview.css",
      "sha256": "c83cea608bb8e97370f5b69c7b71be333eb2cfa6cd7e784c1c4fc5b1b8d52365"
    },
    {
      "path": "src/components/organism/EmailPreview/EmailPreview.tsx",
      "sha256": "8fc1a43188193ba50ef7f6ebde2771aeff97296469155ad389260c6171e82644"
    },
    {
      "path": "src/components/organism/GiftTermsReview/GiftTermsReview.tsx",
      "sha256": "4e7130dddb585f46c07952eadd8054793d2efff05c179e7c8e50b7d98dec6d68"
    },
    {
      "path": "src/components/organism/VoucherRecipientPreview/VoucherRecipientPreview.meta.ts",
      "sha256": "ad98729bf7799412032881561c0259a777573d198f5f00b8bade328a05c56646"
    },
    {
      "path": "src/components/organism/VoucherRecipientPreview/VoucherRecipientPreview.tsx",
      "sha256": "79646ffc48235a37d8afec4a2fabf7c754c299801d12cbc59dea09ffb850cf2e"
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
      "path": "src/data/catalogPublication.ts",
      "sha256": "7d866b520f12a732122d281cadc43a3447751b3153f465e84ee5778637a5ab9b"
    },
    {
      "path": "src/data/dailyAdmission.ts",
      "sha256": "c77aa3e516ab1ef07b5f095fc7b1aea58f3dac83311cdd3a355dc160caed4823"
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
      "path": "src/data/pendingDeskIntent.ts",
      "sha256": "d52c9cb1f78ab1093a28248f521d5ddd11dbabd6d34af883495240ee161d709a"
    },
    {
      "path": "src/data/productCatalog.ts",
      "sha256": "2aa638dd7a252b44a5c8907efe46e57ba4f395af12614b6a162a69b6500ce8f3"
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
      "path": "src/data/sessionAdmission.ts",
      "sha256": "16d15c7d0abf2dbff7828027282987d3970d34bf63cf1cbc1ede18d3dd7ad82d"
    },
    {
      "path": "src/data/tax.ts",
      "sha256": "77628bf8aea929c3edefebcd9a1da40cf9f70b306900af0a3feee8045108231d"
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
      "path": "src/data/vouchers.ts",
      "sha256": "539e5e400952b9ed2bd277b4ccb3145e24c67d91db7bdea72184030b8b5b08ff"
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
      "path": "src/modules/customer/auth/customerReturn.ts",
      "sha256": "cf60c1cc94ae0488455d0b15833dd9923895a0c8d0c0912204d8bb7cca5bed48"
    },
    {
      "path": "src/modules/customer/useTrialAssessment.ts",
      "sha256": "b83a1b553c793a743a1b6c51bb95f09a0acff60c0bb5e14802bf28f9313ccefb"
    },
    {
      "path": "src/modules/transfers/TransferQueuePage.tsx",
      "sha256": "e7a603697223403dac26c5cf72d04e0bb56dcc9fa10c9d3c173e12d034f57ea6"
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
      "sha256": "a0a2a75613ee158551e32242baa4f6872749549b040cd98bb93ac03e98d97235"
    },
    {
      "path": "src/modules/transfers/receipts.ts",
      "sha256": "b3a108c86e194420fe67fb0b7908d0d6aaba1d3e6d7a9c9171ec502c5fe64101"
    },
    {
      "path": "src/modules/transfers/specs.ts",
      "sha256": "3c91398b75c788fbda362441c79522b0ab3376b5235e9d53c65dab5097b57e95"
    },
    {
      "path": "src/modules/transfers/strings.ts",
      "sha256": "3c1596e5efa262d50916f65434c6146fc730f24d9856849f47c342b19fde2969"
    },
    {
      "path": "src/modules/voucher-gifts/index.ts",
      "sha256": "987a58d3a70ddc35da6012acd58938d11de17bcdd2d99855ca3733863d1c13d8"
    },
    {
      "path": "src/modules/voucher-gifts/model.ts",
      "sha256": "ff74f2dee34070e120b943496ac99a4ffeec0fe5fae0dfb58cef738e64d36aa3"
    },
    {
      "path": "src/modules/voucher-gifts/page.tsx",
      "sha256": "a792a7b9e0338fedfc24c22ae728c2b70ca02c9a45abfa0b732e92cb2bc0c1e8"
    },
    {
      "path": "src/modules/voucher-gifts/purchaseCommand.ts",
      "sha256": "a0fdf411b2aba2ea4b3671f4a7feb87e27f34553ddb1d274541ec5b737828fbb"
    },
    {
      "path": "src/modules/voucher-gifts/purchaseFacts.ts",
      "sha256": "307e6e94bf3c9969762f1d7fb47e9e8690450187f256c8397ddf34df9e65ef99"
    },
    {
      "path": "src/modules/voucher-gifts/recipientPreview.ts",
      "sha256": "7b74c12b4c028dbdfc7ae87264365a0c5be496fc9bd849d43b2501c664b9fec7"
    },
    {
      "path": "src/modules/voucher-gifts/spec.ts",
      "sha256": "10a32f5dd367a1f72109d50755df692664984dafcc43c474e7c03e74553783c9"
    },
    {
      "path": "src/modules/voucher-gifts/transfer.ts",
      "sha256": "24c7594050493c3dfc1154fd2adf470145ba1a928cce7e8358cc3601ed24d696"
    },
    {
      "path": "src/modules/voucher-gifts/useRecipientPreview.ts",
      "sha256": "278e00bea90aabff83eca0edf746ca98242bd55d1f603338929f5f220b58f9d5"
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
      "path": "scripts/test-voucher-recipient-preview.mjs",
      "sha256": "1de3653e4359e150b95ce9b35bccb065ab37b789299ac100062e52da8ee3cb30",
      "reviewedSourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
      "verifies": "Actual MockProvider domain scenarios for exact protected approval/issue proof, unregistered recipient, read-only replay, failure/retry and cancellation at every read boundary."
    },
    {
      "path": "scripts/test-voucher-recipient-preview-ui.mjs",
      "sha256": "fb5015055ee87b42263b8f5d2d8bcc6632826ffa57a192dff66c23202a050747",
      "reviewedSourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
      "verifies": "Native S-09 browser adapter scenarios for actual approval, bilingual literal UNSENT copy, exact recipient link and unchanged persisted rows. Reference only; this inventory does not execute or certify browser coverage."
    },
    {
      "path": "scripts/test-voucher-recipient-preview-context.mjs",
      "sha256": "a11c524a69508739c7630d7a7efb7ecf3e69b404e20c0e8f2e3b63a4d0395ff1",
      "reviewedSourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
      "verifies": "Browser adapter scenarios for pending reads, context changes, suppression and retry. Reference only; this inventory does not execute or certify browser coverage."
    },
    {
      "path": "scripts/test-gift-purchase-provider.mjs",
      "sha256": "897e028e8eb55f149e1f69711d51ee72b7747a20acbc6b06598140b7edea2076",
      "reviewedSourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
      "verifies": "Retained actual MockProvider command persistence, protected-table mutation guards, rollback and idempotent replay regression; does not itself verify new recipient rendering."
    },
    {
      "path": "scripts/test-gift-purchase-command.mjs",
      "sha256": "64f9eaaea16c79431d1b5320a4194ee126d8baa02999502c0181e5b5108043c5",
      "reviewedSourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
      "verifies": "Retained pure gift command purchase/approval/claim invariants; does not itself verify new recipient rendering."
    },
    {
      "path": "scripts/test-gift-purchase-flow-ui.mjs",
      "sha256": "474869152c0cb364240f501c7deadda1522898a0eaa03accb362265b6258d9f7",
      "reviewedSourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
      "verifies": "Retained native purchase/approval/auth-return/recipient claim/booking journeys verify the existing redemption destination. This is companion coverage, not actual email delivery."
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
        "status"
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
      "name": "voucher_events",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "voucherId",
        "bookingId",
        "kind",
        "actorId",
        "requestId",
        "fingerprint",
        "payload"
      ],
      "usage": [
        "read"
      ]
    },
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
        "product_id",
        "product_name",
        "classes",
        "image_data_url",
        "review_reason",
        "reviewed_by",
        "reviewed_at"
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
        "taken_by",
        "note",
        "frontend_quote",
        "frontend_receipt"
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
        "slug",
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
        "delta",
        "reason",
        "expires_at"
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
        "payment_id",
        "ledger_id"
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
        "ip",
        "diff"
      ],
      "usage": [
        "read"
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
        "image",
        "voucherId",
        "terms",
        "approvalRequestId"
      ],
      "usage": [
        "read"
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
        "title",
        "benefitKind",
        "benefitTotal",
        "participantCap",
        "capScope",
        "creditUnit",
        "expiresAt",
        "cancellationPolicy",
        "recipientName",
        "recipientContact",
        "message",
        "source",
        "balance",
        "claimedBy",
        "status",
        "issuedBy"
      ],
      "usage": [
        "read"
      ]
    }
  ],
  "mockExtensions": [
    {
      "entity": "payments",
      "field": "frontend_quote",
      "type": "json",
      "source": "src/data/operationalQuotes.ts",
      "reason": "Existing browser-retained sale quote read by readPaymentQuote and protected gift purchase; backend mapping pending. This describes an existing mock field, not a new payment schema or writable preview DTO."
    }
  ],
  "pages": [
    {
      "code": "S-09",
      "route": "/staff/transfers",
      "routeSource": "src/modules/transfers/index.ts",
      "specSource": "src/modules/transfers/specs.ts",
      "specAnchor": "export const transferSpec",
      "routeSpec": "transferSpec",
      "componentSource": "src/modules/transfers/TransferQueuePage.tsx",
      "componentExport": "TransferQueuePage",
      "viewKind": "review-list",
      "specEntities": [
        "users",
        "user_roles",
        "voucher_events",
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
        "recipient preview loading",
        "recipient preview ready / account and language not assumed",
        "recipient preview unavailable",
        "recipient preview read failure / retry",
        "recipient preview obsolete context / hidden"
      ],
      "fixtureIds": [
        "bo02-recipient-loading",
        "bo02-recipient-ready-unregistered",
        "bo02-recipient-unavailable",
        "bo02-recipient-read-failure",
        "bo02-recipient-context-cancelled"
      ]
    }
  ]
}
/* cms-data:end */
;

export default feature;
