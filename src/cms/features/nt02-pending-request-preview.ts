import type {CmsFeatureContract} from '../contracts';
// Bounded inventory, not execution or whole-criterion evidence.
const feature:CmsFeatureContract=
/* cms-data:start */
{
  "id": "nt02-pending-request-preview",
  "revision": 1,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "C-04 retains existing customer route. Preview reads the exact saved cash payment or transfer receipt for the active current customer and verifies canonical pending audit, retained class quote, recipient and no linked booking/ledger activation. Protected upload proof for transfer, retained request intent for cash. No email/outbox write, timing, release policy, financial mutation or connected backend. The unchanged existing C-04 spec declares a legacy invoices dependency; this preview never reads or writes invoices. Subscriptions are browser-local only.",
  "sources": [
    {
      "path": "scripts/pending-request-preview-harness.tsx",
      "sha256": "85d6db12440b358371e9d6cddd6f0f934d7bc2907b3b5be5aafbbd6e728f6754"
    },
    {
      "path": "scripts/session-admission-fixture.mjs",
      "sha256": "fc8212a31f330607823852353ea5d16686ca1e791b523a04290c7381139f44e4"
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
      "path": "src/components/organism/PendingRequestPreview/PendingRequestPreview.meta.ts",
      "sha256": "ea83d7e3d452279be298f1cec38aeacceefdef642b17874a78b86d15be4d5a1b"
    },
    {
      "path": "src/components/organism/PendingRequestPreview/PendingRequestPreview.tsx",
      "sha256": "65ca024062e170dafffef4f627277ac36a9da1cd9b09378a1472f5e4c0c5b730"
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
      "path": "src/data/dailyAdmission.ts",
      "sha256": "c77aa3e516ab1ef07b5f095fc7b1aea58f3dac83311cdd3a355dc160caed4823"
    },
    {
      "path": "src/data/launchReceipts.ts",
      "sha256": "523d1c51c5d40aa9f76f38e48275446ec6742c5027436a7c365378361b01cb08"
    },
    {
      "path": "src/data/mats.ts",
      "sha256": "7c6a8da475b522837b489c8a0d83a421ac8c6f5b648a48ce947037938653bdab"
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
      "path": "src/modules/customer/hooks.ts",
      "sha256": "9132b19e3f1eed143f70ebcb0e7e7bfbfdf61f12a4077118df36e7592ba853ec"
    },
    {
      "path": "src/modules/customer/index.ts",
      "sha256": "9defed5fa35881cac8a9878e57be5fcf9757db9a8bdd8183799fb51eb327e172"
    },
    {
      "path": "src/modules/customer/packageBookingConfirmation.ts",
      "sha256": "c7a481a2d13ad1e2445df3858a077a8dd62345678e076442d88fb6a3c71b33e9"
    },
    {
      "path": "src/modules/customer/pages/CheckoutPage.tsx",
      "sha256": "44901f423f546af3aa466cf7a1d17c546d72a019524cddb5ef6514f6d4781356"
    },
    {
      "path": "src/modules/customer/payments.ts",
      "sha256": "efb14f09e166ad42f0dd00d210fd8a37b5166ce8bcaf7bc520e540cc025a8f6e"
    },
    {
      "path": "src/modules/customer/pendingPreviewStrings.ts",
      "sha256": "f55c62863697fed1b4497db4d75fae3068eb0770bf40d62a506788b3c9077f3c"
    },
    {
      "path": "src/modules/customer/pendingRequestPreview.ts",
      "sha256": "287caf45aa3fc525663e30dfac1e5b23fdc1c10c3d547e891a2c8557cd367b56"
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
      "sha256": "a4e581b7343e94ee97c9a4195b04cd901cde000aff68b92b0aae81c4cf87c421"
    },
    {
      "path": "src/modules/customer/usePendingRequestPreview.ts",
      "sha256": "bc9fb90f7dc397eb30ce695052c561a62ae92b184b6aea3d7417d41823a9bcf4"
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
      "path": "src/modules/transfers/deskSettlement.ts",
      "sha256": "ee1a42af7405bd928f0c4eb75ee388df0d6385abbfd535eb0c1da401869e066c"
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
      "path": "scripts/test-pending-request-preview.mjs",
      "sha256": "7aec775dad738c8b573816d4bddb28649ca9962b3c87d9ccd79aabb206106e4f",
      "reviewedSourceDigest": "b54b7e5d3d174d3c01c18e0bbb21a743984d11a39b521ee99a02c8465f518487",
      "verifies": "Actual MockProvider cash/transfer producers, exact pending source/recipient/proof, nonactivation, read-only replay, source corruption and every guarded read boundary."
    },
    {
      "path": "scripts/test-pending-request-preview-ui.mjs",
      "sha256": "83d6309e0cfa041e033c5b44b67bffbae1647367b21d66317858e8005929fbdd",
      "reviewedSourceDigest": "b54b7e5d3d174d3c01c18e0bbb21a743984d11a39b521ee99a02c8465f518487",
      "verifies": "Actual compiled C-04 cash/transfer saves, EN/ES mobile/desktop literal UNSENT preview, inert CTA and unchanged persisted financial history; references are not executed by this inventory."
    },
    {
      "path": "scripts/test-pending-request-preview-context.mjs",
      "sha256": "78d939cc178ddfadaa44cd9ae9a5a5db07d4798a9ffe43f5c5b055056daa5240",
      "reviewedSourceDigest": "b54b7e5d3d174d3c01c18e0bbb21a743984d11a39b521ee99a02c8465f518487",
      "verifies": "Actual C-04 DEV delayed proof, independent actor/role/provider/route/query/unmount changes, read failure/retry, negative sources and rollback; inventory does not execute browser tests."
    },
    {
      "path": "scripts/test-pending-desk-intent.mjs",
      "sha256": "2f3844c6319c5895d4ed6960eccf6e65c936e09a612ed688bb4329ed4b6a5175",
      "reviewedSourceDigest": "b54b7e5d3d174d3c01c18e0bbb21a743984d11a39b521ee99a02c8465f518487",
      "verifies": "Retained saved cash-request metadata and reconciliation regression; no timer or hold policy."
    },
    {
      "path": "scripts/test-transfer-receipts.mjs",
      "sha256": "ded94b212b10938c22da76bef6daac3180548e44f148cb0f0f750da2677a67e4",
      "reviewedSourceDigest": "b54b7e5d3d174d3c01c18e0bbb21a743984d11a39b521ee99a02c8465f518487",
      "verifies": "Retained actual MockProvider transfer persistence, review, rollback and original financial-command regression."
    },
    {
      "path": "scripts/test-receipt-alert-intent.mjs",
      "sha256": "8630528329b620ffd1d271509a890342754e989c4222fa17388a292c74f98916",
      "reviewedSourceDigest": "b54b7e5d3d174d3c01c18e0bbb21a743984d11a39b521ee99a02c8465f518487",
      "verifies": "Retained protected upload-intent and local rehearsal proof; no real send."
    }
  ],
  "entities": [
    {
      "name": "class_sessions",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "status",
        "starts_at",
        "ends_at",
        "teacher_id",
        "room_id",
        "modality_id",
        "template_id",
        "capacity",
        "booked_count"
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
        "name_en"
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
        "user_id"
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
        "payment_id",
        "ledger_id",
        "status",
        "mat_number"
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
        "payment_id",
        "plan_id",
        "delta",
        "reason"
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
        "status",
        "plan_id"
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
        "price"
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
        "frontend_receipt",
        "frontend_quote",
        "frontend_desk_intent"
      ],
      "usage": [
        "read"
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
        "session_id",
        "mat_number",
        "product_id",
        "product_name",
        "classes",
        "expires_at",
        "image_data_url",
        "file_name",
        "mime_type",
        "byte_size",
        "status",
        "amount_received",
        "review_reason",
        "reviewed_by",
        "reviewed_at",
        "booking_id"
      ],
      "usage": [
        "read"
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
        "diff",
        "ip"
      ],
      "usage": [
        "read"
      ]
    },
    {
      "name": "voucher_bookings",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "sessionId",
        "status",
        "participants",
        "mats"
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
        "updated_at"
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
      "reason": "Existing optional browser-only retained request metadata; backend mapping remains pending. Not a new database column or backend migration."
    },
    {
      "entity": "payments",
      "field": "frontend_desk_intent",
      "type": "json",
      "source": "src/data/pendingDeskIntent.ts",
      "reason": "Existing optional browser-only retained request metadata; backend mapping remains pending. Not a new database column or backend migration."
    },
    {
      "entity": "bookings",
      "field": "mat_number",
      "type": "int",
      "source": "src/data/mats.ts",
      "reason": "Existing optional browser mat field; backend mapping remains pending."
    }
  ],
  "pages": [
    {
      "code": "C-04",
      "route": "/app/checkout/:id",
      "routeSource": "src/modules/customer/index.ts",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "'C-04': ext('C-04'",
      "routeSpec": "canvasSpecs['C-04']",
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
        "invoices"
      ],
      "views": [],
      "states": [
        "Pending-request preview loading",
        "Pending-request preview ready cash",
        "Pending-request preview ready transfer",
        "Pending-request preview unavailable",
        "Pending-request preview read failure / retry",
        "Pending-request preview stale context / hidden"
      ],
      "fixtureIds": [
        "nt02-pending-request-0",
        "nt02-pending-request-1",
        "nt02-pending-request-2",
        "nt02-pending-request-3",
        "nt02-pending-request-4",
        "nt02-pending-request-5"
      ]
    }
  ]
}
/* cms-data:end */;
export default feature;
