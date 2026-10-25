import type { CmsFixture } from './contracts';

// Synthetic partial shape samples only: not executable provider records, proof, application seed,
// command DTOs or test completion evidence. State belongs to the fixture envelope, never a DB row.
// The ready sample has eight proof-source shapes and intentionally no recipient user/account.
export const cmsFixtures: CmsFixture[] =
/* cms-data:start */
[
  {
    "id": "bo02-recipient-loading",
    "sourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
    "feature": "bo02-recipient-preview",
    "page": "S-09",
    "state": "recipient preview loading",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reviewer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "email": "fictional-reviewer@example.test",
          "status": "active"
        }
      }
    ]
  },
  {
    "id": "bo02-recipient-ready-unregistered",
    "sourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
    "feature": "bo02-recipient-preview",
    "page": "S-09",
    "state": "recipient preview ready / account and language not assumed",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reviewer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "email": "fictional-reviewer@example.test",
          "status": "active"
        }
      },
      {
        "entity": "user_roles",
        "values": {
          "id": "cms-fictional-reviewer-role",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "user_id": "cms-fictional-reviewer",
          "role": "admin"
        }
      },
      {
        "entity": "payments",
        "values": {
          "id": "cms-fictional-payment",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "status": "approved",
          "taken_by": "cms-fictional-reviewer",
          "method": "transfer",
          "provider": "manual"
        }
      },
      {
        "entity": "gift_purchase_intents",
        "values": {
          "id": "gift-purchase:cms-fictional-payment",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "paymentId": "cms-fictional-payment",
          "buyerId": "cms-fictional-buyer",
          "recipientEmail": "fictional-unregistered-recipient@example.test",
          "voucherId": "cms-fictional-voucher",
          "approvalRequestId": "gift-purchase-request:cms-fictional-reviewer:cms-fictional-approval"
        }
      },
      {
        "entity": "gift_purchase_requests",
        "values": {
          "id": "gift-purchase-request:cms-fictional-reviewer:cms-fictional-approval",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "actorId": "cms-fictional-reviewer",
          "type": "approve"
        }
      },
      {
        "entity": "vouchers",
        "values": {
          "id": "cms-fictional-voucher",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "title": "Fictional class gift",
          "benefitKind": "classes",
          "benefitTotal": 1,
          "recipientName": "Fictional recipient",
          "recipientContact": "fictional-unregistered-recipient@example.test",
          "source": "purchased_gift",
          "status": "issued",
          "issuedBy": "cms-fictional-reviewer"
        }
      },
      {
        "entity": "voucher_events",
        "values": {
          "id": "cms-fictional-issue-event",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "voucherId": "cms-fictional-voucher",
          "bookingId": null,
          "kind": "issue",
          "actorId": "cms-fictional-reviewer",
          "requestId": "gift-issue:cms-fictional-payment"
        }
      },
      {
        "entity": "audit_log",
        "values": {
          "id": "cms-fictional-approval-audit",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "actor_id": "cms-fictional-reviewer",
          "action": "gift.mock.approve",
          "entity": "payments",
          "entity_id": "cms-fictional-payment",
          "diff": {
            "request_id": "gift-purchase-request:cms-fictional-reviewer:cms-fictional-approval",
            "purchase_id": "gift-purchase:cms-fictional-payment",
            "voucher_id": "cms-fictional-voucher",
            "simulated": true
          }
        }
      }
    ]
  },
  {
    "id": "bo02-recipient-unavailable",
    "sourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
    "feature": "bo02-recipient-preview",
    "page": "S-09",
    "state": "recipient preview unavailable",
    "rows": [
      {
        "entity": "payments",
        "values": {
          "id": "cms-fictional-unavailable-payment",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "status": "pending"
        }
      }
    ]
  },
  {
    "id": "bo02-recipient-read-failure",
    "sourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
    "feature": "bo02-recipient-preview",
    "page": "S-09",
    "state": "recipient preview read failure / retry",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reviewer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "email": "fictional-reviewer@example.test",
          "status": "active"
        }
      }
    ]
  },
  {
    "id": "bo02-recipient-context-cancelled",
    "sourceDigest": "eec147db82d258b48a841ccc931fa4970fdf54b06729cd2dc35699283e02591a",
    "feature": "bo02-recipient-preview",
    "page": "S-09",
    "state": "recipient preview obsolete context / hidden",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reviewer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T12:00:00Z",
          "updated_at": "2026-10-25T12:00:00Z",
          "email": "fictional-reviewer@example.test",
          "status": "active"
        }
      }
    ]
  }
]
/* cms-data:end */
;

export default cmsFixtures;
