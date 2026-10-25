import type {CmsFixture} from './contracts';
// Synthetic shapes only; the adapter tests verify full protected command proofs.
const fixtures:CmsFixture[]=
/* cms-data:start */
[
  {
    "id": "nt02-pending-request-0",
    "sourceDigest": "2e56c6fe149b8c6604d0616d2aa16f5f19a5bbac013e0182c37fabdb349742b7",
    "feature": "nt02-pending-request-preview",
    "page": "C-04",
    "state": "Pending-request preview loading",
    "rows": [
      {
        "entity": "users",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-customer",
          "email": "fictional-customer@example.test",
          "status": "active"
        }
      }
    ]
  },
  {
    "id": "nt02-pending-request-1",
    "sourceDigest": "2e56c6fe149b8c6604d0616d2aa16f5f19a5bbac013e0182c37fabdb349742b7",
    "feature": "nt02-pending-request-preview",
    "page": "C-04",
    "state": "Pending-request preview ready cash",
    "rows": [
      {
        "entity": "users",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-customer",
          "email": "fictional-customer@example.test",
          "status": "active"
        }
      },
      {
        "entity": "payments",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-1-payment",
          "user_id": "cms-fictional-customer",
          "amount": 25000,
          "currency": "COP",
          "method": "cash",
          "provider": "manual",
          "status": "pending",
          "paid_at": null,
          "amount_paid": null,
          "taken_by": null
        }
      },
      {
        "entity": "audit_log",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-1-audit",
          "actor_id": "cms-fictional-customer",
          "action": "payment.mock.pending",
          "entity": "payments",
          "entity_id": "cms-fictional-1-payment",
          "diff": {
            "source": "fictional-payment-checkout",
            "simulated": true,
            "method": "cash",
            "status": "pending"
          }
        }
      }
    ]
  },
  {
    "id": "nt02-pending-request-2",
    "sourceDigest": "2e56c6fe149b8c6604d0616d2aa16f5f19a5bbac013e0182c37fabdb349742b7",
    "feature": "nt02-pending-request-preview",
    "page": "C-04",
    "state": "Pending-request preview ready transfer",
    "rows": [
      {
        "entity": "users",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-customer",
          "email": "fictional-customer@example.test",
          "status": "active"
        }
      },
      {
        "entity": "payments",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-2-payment",
          "user_id": "cms-fictional-customer",
          "amount": 25000,
          "currency": "COP",
          "method": "transfer",
          "provider": "manual",
          "status": "pending",
          "paid_at": null,
          "amount_paid": null,
          "taken_by": null
        }
      },
      {
        "entity": "audit_log",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-2-audit",
          "actor_id": "cms-fictional-customer",
          "action": "payment.mock.pending",
          "entity": "payments",
          "entity_id": "cms-fictional-2-payment",
          "diff": {
            "source": "fictional-payment-checkout",
            "simulated": true,
            "method": "transfer",
            "status": "pending"
          }
        }
      }
    ]
  },
  {
    "id": "nt02-pending-request-3",
    "sourceDigest": "2e56c6fe149b8c6604d0616d2aa16f5f19a5bbac013e0182c37fabdb349742b7",
    "feature": "nt02-pending-request-preview",
    "page": "C-04",
    "state": "Pending-request preview unavailable",
    "rows": [
      {
        "entity": "users",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-customer",
          "email": "fictional-customer@example.test",
          "status": "active"
        }
      }
    ]
  },
  {
    "id": "nt02-pending-request-4",
    "sourceDigest": "2e56c6fe149b8c6604d0616d2aa16f5f19a5bbac013e0182c37fabdb349742b7",
    "feature": "nt02-pending-request-preview",
    "page": "C-04",
    "state": "Pending-request preview read failure / retry",
    "rows": [
      {
        "entity": "users",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-customer",
          "email": "fictional-customer@example.test",
          "status": "active"
        }
      }
    ]
  },
  {
    "id": "nt02-pending-request-5",
    "sourceDigest": "2e56c6fe149b8c6604d0616d2aa16f5f19a5bbac013e0182c37fabdb349742b7",
    "feature": "nt02-pending-request-preview",
    "page": "C-04",
    "state": "Pending-request preview stale context / hidden",
    "rows": [
      {
        "entity": "users",
        "values": {
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "id": "cms-fictional-customer",
          "email": "fictional-customer@example.test",
          "status": "active"
        }
      }
    ]
  }
]
/* cms-data:end */;
export default fixtures;
