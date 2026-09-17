---
title: Incidents and emergencies
role: everyone
part: II
version: 0.6.0
updated: 2026-09-17
summary: Medical emergency, heat exhaustion, evacuation, contacts and how an incident is recorded.
---

# Incidents and emergencies

The order is always the same: **the person first, the record second.** Never the other way round.

## 1. Medical emergency
1. Stop the class if it is in the room. Whoever is closest stays with the person; front desk calls the
   emergency line <local number> and alerts coordination.
2. Open **M-06 CRM** → member → header: emergency contact (captured in A-03 Create account or S-04 at
   registration) and health marker.
3. Call the emergency contact only if the person cannot.
4. First-aid kit at <location>; do not give medication.
5. Afterwards: note in M-06 with category "Injury / health", time, what happened and what was done.
   Coordination informs the owner the same day.

**Steps in HoyOS:** S-02 → Member profile (opens M-06) → emergency contact. Note: M-06 → Notes → Add note.

![The member header: emergency contact and health marker](../../screenshots/M-06/en-1280.jpg "M-06 · /admin/crm")

## 2. Heat: dizziness, nausea, heat exhaustion
In a heated room this is the most likely incident and it almost always resolves early.

1. Signs: pallor, dizziness, nausea, sweating stops, speech goes odd. The teacher sees it from the front.
2. Get them out of the room, sit them down, don't lay them flat all at once; water in sips, not gulps.
3. If it doesn't improve within a few minutes, or there is confusion or vomiting: it is a medical
   emergency, point 1.
4. The person does not return to the room that session, even if they say they're fine.
5. Always record it, even when it resolved on its own: note in M-06 with category, time and the class.
   Three heat notes in the same slot is a room problem, not a people problem (`07`).

## 3. Evacuation
1. Signal: the teacher's or front desk's voice. Exits via <route>; meeting point <place>.
2. Front desk leaves with the day's roster (S-02 on the phone) and confirms every checked-in person is out.
3. Nobody goes back for belongings. Front desk calls emergency services and coordination.

## 4. Contacts
| Contact | Where |
|---|---|
| Emergency services | <local number> |
| Coordination | <number> |
| Owner | <number> |
| Member's emergency contact | M-06 → header |
| Nearest clinic | <name and address> |

{{tenant:contact}}

> DECISION NEEDED: numbers, evacuation routes and the reference clinic.

## 5. Incidents that are not medical
Theft, damage, a conflict between people, someone not respecting a boundary, a teacher who doesn't arrive.

1. Cut the situation short; if there is risk, get the person out of the space.
2. Note in M-06 with category, time, who was there and what was done.
3. Tell coordination the same day; the owner if there was damage, money or a third party involved.
4. Nothing is ever published, and nothing is discussed with other members.

![Everything that happened, with actor and time](../../screenshots/M-07/en-1280.jpg "M-07 · /admin/activity")

## 6. What gets recorded
Every action in HoyOS — including reading a member record — lands in **M-07 All activity log** with your
name. That is the member's guarantee, and yours too.

{{table:audit_log}}
