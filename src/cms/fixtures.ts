import type { CmsFixture } from './contracts';

// Fictional, bounded contract samples; existing provider tests verify runtime behavior.
export default (
/* cms-data:start */
[
  {
    "id": "gift-c-17-pending",
    "feature": "gift",
    "page": "C-17",
    "state": "pending",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-gift-c-17-pending",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "plan_id": "cms-fictional-plan",
          "status": "pending",
          "amount": 10000,
          "currency": "COP"
        }
      }
    ],
    "sourceDigest": "f4a5584100473dc640ca64148927157689926530933d6fef64be4f12d27cb7ae"
  },
  {
    "id": "gift-c-17-approved",
    "feature": "gift",
    "page": "C-17",
    "state": "approved",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-gift-c-17-approved",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "plan_id": "cms-fictional-plan",
          "status": "approved",
          "amount": 10000,
          "currency": "COP"
        }
      },
      {
        "entity": "gift_cards",
        "values": {
          "id": "cms-fictional-gift",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "status": "draft",
          "buyer_user_id": "cms-fictional-buyer",
          "amount": 10000,
          "balance": 10000,
          "frontend_quote": {
            "fictional": true
          }
        }
      }
    ],
    "sourceDigest": "f4a5584100473dc640ca64148927157689926530933d6fef64be4f12d27cb7ae"
  },
  {
    "id": "gift-c-17-declined",
    "feature": "gift",
    "page": "C-17",
    "state": "declined",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-gift-c-17-declined",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "plan_id": "cms-fictional-plan",
          "status": "declined",
          "amount": 10000,
          "currency": "COP"
        }
      }
    ],
    "sourceDigest": "f4a5584100473dc640ca64148927157689926530933d6fef64be4f12d27cb7ae"
  },
  {
    "id": "classes-c-06-pending",
    "feature": "classes",
    "page": "C-06",
    "state": "pending",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-classes-c-06-pending",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "plan_id": "cms-fictional-plan",
          "status": "pending",
          "amount": 10000,
          "currency": "COP"
        }
      }
    ],
    "sourceDigest": "f5dcd05eda14e2ef134e6d8f358868f18a46dafb893261d63d55cce7b77d5feb"
  },
  {
    "id": "classes-c-06-approved",
    "feature": "classes",
    "page": "C-06",
    "state": "approved",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-classes-c-06-approved",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "plan_id": "cms-fictional-plan",
          "status": "approved",
          "amount": 10000,
          "currency": "COP"
        }
      }
    ],
    "sourceDigest": "f5dcd05eda14e2ef134e6d8f358868f18a46dafb893261d63d55cce7b77d5feb"
  },
  {
    "id": "classes-c-06-declined",
    "feature": "classes",
    "page": "C-06",
    "state": "declined",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-classes-c-06-declined",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "plan_id": "cms-fictional-plan",
          "status": "declined",
          "amount": 10000,
          "currency": "COP"
        }
      }
    ],
    "sourceDigest": "f5dcd05eda14e2ef134e6d8f358868f18a46dafb893261d63d55cce7b77d5feb"
  },
  {
    "id": "classes-c-07b-pending",
    "feature": "classes",
    "page": "C-07b",
    "state": "pending",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-classes-c-07b-pending",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "plan_id": "cms-fictional-plan",
          "status": "pending",
          "amount": 10000,
          "currency": "COP"
        }
      }
    ],
    "sourceDigest": "f5dcd05eda14e2ef134e6d8f358868f18a46dafb893261d63d55cce7b77d5feb"
  },
  {
    "id": "classes-c-07b-approved",
    "feature": "classes",
    "page": "C-07b",
    "state": "approved",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-classes-c-07b-approved",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "plan_id": "cms-fictional-plan",
          "status": "approved",
          "amount": 10000,
          "currency": "COP"
        }
      }
    ],
    "sourceDigest": "f5dcd05eda14e2ef134e6d8f358868f18a46dafb893261d63d55cce7b77d5feb"
  },
  {
    "id": "classes-c-07b-declined",
    "feature": "classes",
    "page": "C-07b",
    "state": "declined",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-classes-c-07b-declined",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "plan_id": "cms-fictional-plan",
          "status": "declined",
          "amount": 10000,
          "currency": "COP"
        }
      }
    ],
    "sourceDigest": "f5dcd05eda14e2ef134e6d8f358868f18a46dafb893261d63d55cce7b77d5feb"
  },
  {
    "id": "transfers-s-09-pending",
    "feature": "transfers",
    "page": "S-09",
    "state": "pending",
    "rows": [
      {
        "entity": "transfer_receipts",
        "values": {
          "id": "cms-fixture-transfers-s-09-pending",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "payment_id": "cms-fictional-payment",
          "status": "pending",
          "file_name": "fictional.png",
          "mime_type": "image/png",
          "byte_size": 9
        }
      }
    ],
    "sourceDigest": "348f31c929e4a7247e03be15a236f4af9f675a6ecdc50b6e13815f32cf4714b4"
  },
  {
    "id": "transfers-s-09-approved",
    "feature": "transfers",
    "page": "S-09",
    "state": "approved",
    "rows": [
      {
        "entity": "transfer_receipts",
        "values": {
          "id": "cms-fixture-transfers-s-09-approved",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "payment_id": "cms-fictional-payment",
          "status": "approved",
          "file_name": "fictional.png",
          "mime_type": "image/png",
          "byte_size": 9
        }
      }
    ],
    "sourceDigest": "348f31c929e4a7247e03be15a236f4af9f675a6ecdc50b6e13815f32cf4714b4"
  },
  {
    "id": "transfers-s-09-rejected",
    "feature": "transfers",
    "page": "S-09",
    "state": "rejected",
    "rows": [
      {
        "entity": "transfer_receipts",
        "values": {
          "id": "cms-fixture-transfers-s-09-rejected",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "payment_id": "cms-fictional-payment",
          "status": "rejected",
          "file_name": "fictional.png",
          "mime_type": "image/png",
          "byte_size": 9
        }
      }
    ],
    "sourceDigest": "348f31c929e4a7247e03be15a236f4af9f675a6ecdc50b6e13815f32cf4714b4"
  },
  {
    "id": "transfers-m-03-pending",
    "feature": "transfers",
    "page": "M-03",
    "state": "pending",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fixture-transfers-m-03-pending",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-member",
          "status": "pending",
          "amount": 10000,
          "currency": "COP"
        }
      }
    ],
    "sourceDigest": "348f31c929e4a7247e03be15a236f4af9f675a6ecdc50b6e13815f32cf4714b4"
  }
]
/* cms-data:end */
) satisfies CmsFixture[];
