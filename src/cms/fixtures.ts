import type { CmsFixture } from './contracts';

// Fictional shape samples only; proof and transitions are exercised by referenced adapter tests.
export default (
/* cms-data:start */
[
  {
    "id": "nt02-a-02-fictional-current-challenge",
    "feature": "nt02-launch-previews",
    "sourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
    "page": "A-02",
    "state": "fictional-current-challenge",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-buyer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-nt02@example.test",
          "status": "active",
          "locale": "es"
        }
      }
    ]
  },
  {
    "id": "nt02-a-03-committed-welcome",
    "feature": "nt02-launch-previews",
    "sourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
    "page": "A-03",
    "state": "committed-welcome",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-buyer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-nt02@example.test",
          "status": "active",
          "locale": "es"
        }
      },
      {
        "entity": "audit_log",
        "values": {
          "id": "cms-fictional-registration-proof",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "actor_id": "cms-fictional-public",
          "action": "mock.registration",
          "entity": "users",
          "entity_id": "cms-fictional-buyer",
          "diff": {
            "source": "fictional-browser-registration",
            "role": "customer",
            "userId": "cms-fictional-buyer"
          }
        }
      },
      {
        "entity": "email_templates",
        "values": {
          "id": "cms-fictional-welcome",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "key": "welcome",
          "trigger": "user.created",
          "subject": {
            "es": "Bienvenida ficticia",
            "en": "Fictional welcome"
          },
          "body_mjml": "{\"es\": \"Hola {{first_name}}\", \"en\": \"Hello {{first_name}}\"}",
          "version": 2,
          "active": false
        }
      }
    ]
  },
  {
    "id": "nt02-a-03-source-unavailable",
    "feature": "nt02-launch-previews",
    "sourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
    "page": "A-03",
    "state": "source-unavailable",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-buyer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-nt02@example.test",
          "status": "active",
          "locale": "es"
        }
      }
    ]
  },
  {
    "id": "nt02-c-04-approved-confirmation",
    "feature": "nt02-launch-previews",
    "sourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
    "page": "C-04",
    "state": "approved-confirmation",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-buyer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-nt02@example.test",
          "status": "active",
          "locale": "es"
        }
      },
      {
        "entity": "payments",
        "values": {
          "id": "cms-fictional-payment",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "plan_id": "cms-fictional-plan",
          "currency": "COP",
          "amount": 55000,
          "amount_paid": 55000,
          "method": "card",
          "provider": "wompi",
          "status": "approved"
        }
      }
    ]
  },
  {
    "id": "nt02-c-04-declined-preview",
    "feature": "nt02-launch-previews",
    "sourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
    "page": "C-04",
    "state": "declined-preview",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-buyer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-nt02@example.test",
          "status": "active",
          "locale": "es"
        }
      },
      {
        "entity": "payments",
        "values": {
          "id": "cms-fictional-payment",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "plan_id": "cms-fictional-plan",
          "currency": "COP",
          "amount": 55000,
          "amount_paid": null,
          "method": "card",
          "provider": "wompi",
          "status": "declined"
        }
      }
    ]
  },
  {
    "id": "nt02-c-04-source-unavailable",
    "feature": "nt02-launch-previews",
    "sourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
    "page": "C-04",
    "state": "source-unavailable",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-buyer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-nt02@example.test",
          "status": "active",
          "locale": "es"
        }
      }
    ]
  },
  {
    "id": "nt02-c-08-verified-reschedule-summary",
    "feature": "nt02-launch-previews",
    "sourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
    "page": "C-08",
    "state": "verified-reschedule-summary",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-buyer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-nt02@example.test",
          "status": "active",
          "locale": "es"
        }
      },
      {
        "entity": "bookings",
        "values": {
          "id": "cms-fictional-old",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "session_id": "cms-fictional-session-old",
          "status": "cancelled",
          "paid_with": "package",
          "ledger_id": "cms-fictional-debit",
          "payment_id": "cms-fictional-payment"
        }
      },
      {
        "entity": "bookings",
        "values": {
          "id": "cms-fictional-new",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "session_id": "cms-fictional-session-new",
          "status": "booked",
          "paid_with": "package",
          "ledger_id": "cms-fictional-debit",
          "payment_id": "cms-fictional-payment"
        }
      },
      {
        "entity": "audit_log",
        "values": {
          "id": "cms-fictional-move-proof",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "actor_id": "cms-fictional-buyer",
          "action": "booking.reschedule",
          "entity": "bookings",
          "entity_id": "cms-fictional-old",
          "diff": {
            "source": "app",
            "from_session_id": "cms-fictional-session-old",
            "to_session_id": "cms-fictional-session-new",
            "replacement_booking_id": "cms-fictional-new"
          }
        }
      }
    ]
  },
  {
    "id": "nt02-c-08b-reschedule-source-proof",
    "feature": "nt02-launch-previews",
    "sourceDigest": "f04868e6473a3b6ac9eff180ce70e51cf4e863d380acb2e91060c80610a5be2e",
    "page": "C-08b",
    "state": "reschedule-source-proof",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-buyer",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-nt02@example.test",
          "status": "active",
          "locale": "es"
        }
      },
      {
        "entity": "bookings",
        "values": {
          "id": "cms-fictional-old",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "session_id": "cms-fictional-session-old",
          "status": "cancelled",
          "paid_with": "package",
          "ledger_id": "cms-fictional-debit",
          "payment_id": "cms-fictional-payment"
        }
      },
      {
        "entity": "bookings",
        "values": {
          "id": "cms-fictional-new",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-buyer",
          "session_id": "cms-fictional-session-new",
          "status": "booked",
          "paid_with": "package",
          "ledger_id": "cms-fictional-debit",
          "payment_id": "cms-fictional-payment"
        }
      },
      {
        "entity": "audit_log",
        "values": {
          "id": "cms-fictional-move-proof",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "actor_id": "cms-fictional-buyer",
          "action": "booking.reschedule",
          "entity": "bookings",
          "entity_id": "cms-fictional-old",
          "diff": {
            "source": "app",
            "from_session_id": "cms-fictional-session-old",
            "to_session_id": "cms-fictional-session-new",
            "replacement_booking_id": "cms-fictional-new"
          }
        }
      }
    ]
  }
]
/* cms-data:end */
) satisfies CmsFixture[];
