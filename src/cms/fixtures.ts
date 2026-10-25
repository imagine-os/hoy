import type { CmsFixture } from './contracts';
// Synthetic shape samples only, not command proofs, generated rows or test completion evidence.
const fixtures = (
/* cms-data:start */
[
  {
    "id": "ad01-w-04-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "W-04",
    "state": "Synthetic published shape",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": true,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-w-04-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "W-04",
    "state": "Synthetic withdrawn shape",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": false,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-w-05-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "W-05",
    "state": "Synthetic published shape",
    "rows": [
      {
        "entity": "teachers",
        "values": {
          "id": "cms-fictional-teacher",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "display_name": "FICTIONAL AD01 TEACHER",
          "active": true
        }
      }
    ]
  },
  {
    "id": "ad01-w-05-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "W-05",
    "state": "Synthetic withdrawn shape",
    "rows": [
      {
        "entity": "teachers",
        "values": {
          "id": "cms-fictional-teacher",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "display_name": "FICTIONAL AD01 TEACHER",
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-w-10-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "W-10",
    "state": "Synthetic published shape",
    "rows": [
      {
        "entity": "faq_entries",
        "values": {
          "id": "cms-fictional-faq",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "group_key": "cms-fictional-group",
          "question": {
            "es": "PREGUNTA FICTICIA",
            "en": "FICTIONAL QUESTION"
          },
          "answer": {
            "es": "RESPUESTA FICTICIA",
            "en": "FICTIONAL ANSWER"
          },
          "page": 1,
          "sort": 1,
          "published": true
        }
      }
    ]
  },
  {
    "id": "ad01-w-10-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "W-10",
    "state": "Synthetic withdrawn shape",
    "rows": [
      {
        "entity": "faq_entries",
        "values": {
          "id": "cms-fictional-faq",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "group_key": "cms-fictional-group",
          "question": {
            "es": "PREGUNTA FICTICIA",
            "en": "FICTIONAL QUESTION"
          },
          "answer": {
            "es": "RESPUESTA FICTICIA",
            "en": "FICTIONAL ANSWER"
          },
          "page": 1,
          "sort": 1,
          "published": false
        }
      }
    ]
  },
  {
    "id": "ad01-c-02-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "C-02",
    "state": "Synthetic published shape",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": true,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-c-02-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "C-02",
    "state": "Synthetic withdrawn shape",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": false,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-c-03-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "C-03",
    "state": "Synthetic published shape",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": true,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-c-03-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "C-03",
    "state": "Synthetic withdrawn shape",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": false,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-c-14-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "C-14",
    "state": "Synthetic published shape",
    "rows": [
      {
        "entity": "faq_entries",
        "values": {
          "id": "cms-fictional-faq",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "group_key": "cms-fictional-group",
          "question": {
            "es": "PREGUNTA FICTICIA",
            "en": "FICTIONAL QUESTION"
          },
          "answer": {
            "es": "RESPUESTA FICTICIA",
            "en": "FICTIONAL ANSWER"
          },
          "page": 1,
          "sort": 1,
          "published": true
        }
      }
    ]
  },
  {
    "id": "ad01-c-14-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "C-14",
    "state": "Synthetic withdrawn shape",
    "rows": [
      {
        "entity": "faq_entries",
        "values": {
          "id": "cms-fictional-faq",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "group_key": "cms-fictional-group",
          "question": {
            "es": "PREGUNTA FICTICIA",
            "en": "FICTIONAL QUESTION"
          },
          "answer": {
            "es": "RESPUESTA FICTICIA",
            "en": "FICTIONAL ANSWER"
          },
          "page": 1,
          "sort": 1,
          "published": false
        }
      }
    ]
  },
  {
    "id": "ad01-c-18-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "C-18",
    "state": "Synthetic published shape",
    "rows": [
      {
        "entity": "teachers",
        "values": {
          "id": "cms-fictional-teacher",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "display_name": "FICTIONAL AD01 TEACHER",
          "active": true
        }
      }
    ]
  },
  {
    "id": "ad01-c-18-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "C-18",
    "state": "Synthetic withdrawn shape",
    "rows": [
      {
        "entity": "teachers",
        "values": {
          "id": "cms-fictional-teacher",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "display_name": "FICTIONAL AD01 TEACHER",
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-s-02-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-02",
    "state": "Synthetic published shape",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": true,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-s-02-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-02",
    "state": "Synthetic withdrawn shape",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": false,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-m-02-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02",
    "state": "Synthetic draft catalog with unpublished room",
    "rows": [
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": false,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "teachers",
        "values": {
          "id": "cms-fictional-teacher",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "display_name": "FICTIONAL AD01 TEACHER",
          "active": false
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false,
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-m-02-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02",
    "state": "Synthetic published catalog; room unchanged",
    "rows": [
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": true,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "teachers",
        "values": {
          "id": "cms-fictional-teacher",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "display_name": "FICTIONAL AD01 TEACHER",
          "active": true
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-m-02-2",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02",
    "state": "Synthetic withdrawn catalog; room retained",
    "rows": [
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": false,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "teachers",
        "values": {
          "id": "cms-fictional-teacher",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "display_name": "FICTIONAL AD01 TEACHER",
          "active": false
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-m-02b-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02b",
    "state": "Synthetic unpublished FAQ draft",
    "rows": [
      {
        "entity": "faq_entries",
        "values": {
          "id": "cms-fictional-faq",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "group_key": "cms-fictional-group",
          "question": {
            "es": "PREGUNTA FICTICIA",
            "en": "FICTIONAL QUESTION"
          },
          "answer": {
            "es": "RESPUESTA FICTICIA",
            "en": "FICTIONAL ANSWER"
          },
          "page": 1,
          "sort": 1,
          "published": false
        }
      }
    ]
  },
  {
    "id": "ad01-m-02b-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02b",
    "state": "Synthetic published FAQ",
    "rows": [
      {
        "entity": "faq_entries",
        "values": {
          "id": "cms-fictional-faq",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "group_key": "cms-fictional-group",
          "question": {
            "es": "PREGUNTA FICTICIA",
            "en": "FICTIONAL QUESTION"
          },
          "answer": {
            "es": "RESPUESTA FICTICIA",
            "en": "FICTIONAL ANSWER"
          },
          "page": 1,
          "sort": 1,
          "published": true
        }
      }
    ]
  },
  {
    "id": "ad01-m-02b-2",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02b",
    "state": "Synthetic unpublished FAQ after withdrawal",
    "rows": [
      {
        "entity": "faq_entries",
        "values": {
          "id": "cms-fictional-faq",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "group_key": "cms-fictional-group",
          "question": {
            "es": "PREGUNTA FICTICIA",
            "en": "FICTIONAL QUESTION"
          },
          "answer": {
            "es": "RESPUESTA FICTICIA",
            "en": "FICTIONAL ANSWER"
          },
          "page": 1,
          "sort": 1,
          "published": false
        }
      }
    ]
  },
  {
    "id": "ad01-m-14-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-14",
    "state": "Synthetic generated dated occurrence",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": false,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-m-14-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-14",
    "state": "Synthetic edited dated occurrence",
    "rows": [
      {
        "entity": "class_sessions",
        "values": {
          "id": "cms-fictional-session",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "template_id": "cms-fictional-template",
          "title": "FICTIONAL AD01 CLASS",
          "room_id": "cms-fictional-room",
          "teacher_id": "cms-fictional-teacher",
          "starts_at": "2026-10-23T23:00:00Z",
          "ends_at": "2026-10-23T23:50:00Z",
          "capacity": 8,
          "booked_count": 0,
          "status": "scheduled"
        }
      },
      {
        "entity": "class_templates",
        "values": {
          "id": "cms-fictional-template",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "title": "FICTIONAL AD01 CLASS",
          "active": true,
          "generation_mode": "manual",
          "start_date": "2026-10-23",
          "end_date": "2026-10-23",
          "duration_min": 50
        }
      },
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL AD01 ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-m-02-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02",
    "state": "Synthetic draft room",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-m-02-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02",
    "state": "Synthetic published room",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": true
        }
      }
    ]
  },
  {
    "id": "ad01-room-m-02-2",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02",
    "state": "Synthetic legacy room without publication flag",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-m-02-3",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-02",
    "state": "Synthetic retained unpublished room reference",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-m-14-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-14",
    "state": "Synthetic draft room",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-m-14-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-14",
    "state": "Synthetic published room",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": true
        }
      }
    ]
  },
  {
    "id": "ad01-room-m-14-2",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-14",
    "state": "Synthetic legacy room without publication flag",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-m-14-3",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "M-14",
    "state": "Synthetic retained unpublished room reference",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-s-04-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-04",
    "state": "Synthetic draft room",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-s-04-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-04",
    "state": "Synthetic published room",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": true
        }
      }
    ]
  },
  {
    "id": "ad01-room-s-04-2",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-04",
    "state": "Synthetic legacy room without publication flag",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-s-04-3",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-04",
    "state": "Synthetic retained unpublished room reference",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-s-05-0",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-05",
    "state": "Synthetic draft room",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-s-05-1",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-05",
    "state": "Synthetic published room",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": true
        }
      }
    ]
  },
  {
    "id": "ad01-room-s-05-2",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-05",
    "state": "Synthetic legacy room without publication flag",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false
        }
      }
    ]
  },
  {
    "id": "ad01-room-s-05-3",
    "sourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
    "feature": "ad01-content-propagation",
    "page": "S-05",
    "state": "Synthetic retained unpublished room reference",
    "rows": [
      {
        "entity": "rooms",
        "values": {
          "id": "cms-fictional-room",
          "tenant_id": "cms-fictional-tenant",
          "created_at": "2026-10-25T00:00:00Z",
          "updated_at": "2026-10-25T00:00:00Z",
          "name": "FICTIONAL ROOM",
          "capacity": 8,
          "heated": false,
          "active": false
        }
      }
    ]
  }
]
/* cms-data:end */
) satisfies CmsFixture[];
export default fixtures;
