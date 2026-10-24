import type { CmsFixture } from './contracts';

// Fictional partial input shapes; asynchronous states require actual lifecycle regressions.
export default (
/* cms-data:start */
[
  {
    "id": "rc03-s-02-ready",
    "feature": "rc03-reception-search",
    "page": "S-02",
    "state": "ready",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      },
      {
        "entity": "profiles",
        "values": {
          "id": "cms-fictional-reception-profile",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-reception-person",
          "full_name": "FICTIONAL Ángela Núñez",
          "initials": "FN",
          "birthday": null,
          "notes": null,
          "marketing_optin": false,
          "whatsapp_verified": false
        }
      },
      {
        "entity": "user_roles",
        "values": {
          "id": "cms-fictional-reception-role",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-reception-person",
          "role": "customer"
        }
      },
      {
        "entity": "memberships",
        "values": {
          "id": "cms-fictional-reception-membership",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-reception-person",
          "plan_id": "cms-fictional-reception-plan",
          "status": "active"
        }
      },
      {
        "entity": "plans",
        "values": {
          "id": "cms-fictional-reception-plan",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "name_es": "Plan FICTICIO",
          "name_en": "FICTIONAL plan",
          "price": 10000,
          "classes": 12,
          "active": true
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  },
  {
    "id": "rc03-s-02-loading",
    "feature": "rc03-reception-search",
    "page": "S-02",
    "state": "loading",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  },
  {
    "id": "rc03-s-02-read-error",
    "feature": "rc03-reception-search",
    "page": "S-02",
    "state": "read-error",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  },
  {
    "id": "rc03-s-02-no-matches",
    "feature": "rc03-reception-search",
    "page": "S-02",
    "state": "no-matches",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  },
  {
    "id": "rc03-s-02-disabled",
    "feature": "rc03-reception-search",
    "page": "S-02",
    "state": "disabled",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  },
  {
    "id": "rc03-s-04-ready",
    "feature": "rc03-reception-search",
    "page": "S-04",
    "state": "ready",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      },
      {
        "entity": "profiles",
        "values": {
          "id": "cms-fictional-reception-profile",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-reception-person",
          "full_name": "FICTIONAL Ángela Núñez",
          "initials": "FN",
          "birthday": null,
          "notes": null,
          "marketing_optin": false,
          "whatsapp_verified": false
        }
      },
      {
        "entity": "user_roles",
        "values": {
          "id": "cms-fictional-reception-role",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-reception-person",
          "role": "customer"
        }
      },
      {
        "entity": "memberships",
        "values": {
          "id": "cms-fictional-reception-membership",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "user_id": "cms-fictional-reception-person",
          "plan_id": "cms-fictional-reception-plan",
          "status": "active"
        }
      },
      {
        "entity": "plans",
        "values": {
          "id": "cms-fictional-reception-plan",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "name_es": "Plan FICTICIO",
          "name_en": "FICTIONAL plan",
          "price": 10000,
          "classes": 12,
          "active": true
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  },
  {
    "id": "rc03-s-04-loading",
    "feature": "rc03-reception-search",
    "page": "S-04",
    "state": "loading",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  },
  {
    "id": "rc03-s-04-read-error",
    "feature": "rc03-reception-search",
    "page": "S-04",
    "state": "read-error",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  },
  {
    "id": "rc03-s-04-no-matches",
    "feature": "rc03-reception-search",
    "page": "S-04",
    "state": "no-matches",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  },
  {
    "id": "rc03-s-04-disabled",
    "feature": "rc03-reception-search",
    "page": "S-04",
    "state": "disabled",
    "rows": [
      {
        "entity": "users",
        "values": {
          "id": "cms-fictional-reception-person",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-24T12:00:00Z",
          "updated_at": "2026-10-24T12:00:00Z",
          "email": "fictional-reception@example.test",
          "phone": "+573000000099",
          "status": "active"
        }
      }
    ],
    "sourceDigest": "04c88ce9b62bfde6c65a5ea2fdf61043c977cd9c866fd201cd5e550b6009238c"
  }
]
/* cms-data:end */
) satisfies CmsFixture[];
