---
title: Data and tables
role: admin, owner
part: VII
version: 0.6.0
updated: 2026-09-17
summary: The whole data model, how to read an access contract, and the tables that get looked at most.
---

# Data and tables

Everything HoyOS knows sits in tables shaped exactly as they will be in Postgres the day Supabase is
connected. Every table has `id`, `tenant_id`, `created_at` and `updated_at`: multi-tenant from day one.

## 1. The whole model
{{tables}}

![The table manager](../../screenshots/M-03/en-1280.jpg "M-03 · /admin/tables")

## 2. How to read a table
Every table carries its **access contract**: who may read and who may write. That contract becomes the
RLS rules in Postgres, so it is not documentation — it is the security model.

{{table:bookings}}

## 3. The ones looked at most
### Bookings and attendance
{{table:waitlist}}

### Commerce
{{table:memberships}}

### Communications
{{table:message_log}}

## 4. Rules for touching data
1. Nobody edits a table to fix a case that has a screen. If there is a screen, use the screen: the
   screen writes the activity log, the table does not.
2. **M-03 Tables** is for admin and development. A change there still lands in M-07.
3. A list of people is never exported out of the system without the owner's authorisation (`23`).
4. All money is stored in COP as an integer; timestamps in UTC.

## 5. The studio right now
{{stats}}

## 6. Surfaces and screens
The full route list, per surface:

{{routes:customer}}

{{routes:docs}}
