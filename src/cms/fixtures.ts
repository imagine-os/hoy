import type { CmsFixture } from './contracts';

// Fictional partial input shapes; controlled-provider tests establish transient read states.
export default (
/* cms-data:start */
[
  {
    "id": "ad07-m06-ready",
    "feature": "ad07-crm",
    "page": "M-06",
    "state": "ready",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-ad07-user",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-ad07@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      },
      {
        "entity": "profiles",
        "values": {
          "id": "cms-fictional-ad07-profile",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-ad07-user",
          "full_name": "FICTIONAL Long Customer Name For Readable Cell",
          "initials": "FC",
          "birthday": "2000-10-01",
          "notes": null,
          "marketing_optin": false,
          "whatsapp_verified": false
        }
      },
      {
        "entity": "user_roles",
        "values": {
          "id": "cms-fictional-ad07-role",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-ad07-user",
          "role": "customer"
        }
      },
      {
        "entity": "memberships",
        "values": {
          "id": "cms-fictional-ad07-membership",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-ad07-user",
          "plan_id": "cms-fictional-ad07-plan",
          "status": "active"
        }
      },
      {
        "entity": "plans",
        "values": {
          "id": "cms-fictional-ad07-plan",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "name_es": "Paquete FICTICIO",
          "name_en": "FICTIONAL package",
          "classes": 12,
          "active": true
        }
      },
      {
        "entity": "bookings",
        "values": {
          "id": "cms-fictional-ad07-booking",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-ad07-user",
          "status": "checked_in",
          "checked_in_at": "2026-10-23T12:00:00Z"
        }
      },
      {
        "entity": "payments",
        "values": {
          "id": "cms-fictional-ad07-payment",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-ad07-user",
          "plan_id": "cms-fictional-ad07-plan",
          "status": "approved"
        }
      },
      {
        "entity": "class_ledger",
        "values": {
          "id": "cms-fictional-ad07-grant",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-ad07-user",
          "plan_id": "cms-fictional-ad07-plan",
          "payment_id": "cms-fictional-ad07-payment",
          "purchase_ledger_id": null,
          "delta": 12,
          "reason": "purchase",
          "expires_at": "2099-01-01",
          "frozen_from": null,
          "frozen_until": null
        }
      },
      {
        "entity": "class_ledger",
        "values": {
          "id": "cms-fictional-ad07-debit",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-ad07-user",
          "plan_id": "cms-fictional-ad07-plan",
          "payment_id": "cms-fictional-ad07-payment",
          "purchase_ledger_id": "cms-fictional-ad07-grant",
          "delta": -3,
          "reason": "booking",
          "expires_at": null,
          "frozen_from": null,
          "frozen_until": null
        }
      },
      {
        "entity": "vouchers",
        "values": {
          "id": "cms-fictional-ad07-voucher",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "claimedBy": "cms-fictional-ad07-user",
          "balance": 1,
          "status": "active"
        }
      }
    ],
    "sourceDigest": "0abeb0a3474107321ab3310fe506fa231a7831d33713db80ac37911d404d132d"
  },
  {
    "id": "ad07-m06-loading",
    "feature": "ad07-crm",
    "page": "M-06",
    "state": "loading",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-ad07-user",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-ad07@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "0abeb0a3474107321ab3310fe506fa231a7831d33713db80ac37911d404d132d"
  },
  {
    "id": "ad07-m06-read-error",
    "feature": "ad07-crm",
    "page": "M-06",
    "state": "read-error",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-ad07-user",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-ad07@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "0abeb0a3474107321ab3310fe506fa231a7831d33713db80ac37911d404d132d"
  },
  {
    "id": "ad07-m06-empty-filter",
    "feature": "ad07-crm",
    "page": "M-06",
    "state": "empty-filter",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-ad07-user",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-ad07@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "0abeb0a3474107321ab3310fe506fa231a7831d33713db80ac37911d404d132d"
  }
]
/* cms-data:end */
) satisfies CmsFixture[];
