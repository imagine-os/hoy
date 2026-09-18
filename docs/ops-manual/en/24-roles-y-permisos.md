---
title: Roles and permissions
role: everyone
part: VII
version: 0.8.0
updated: 2026-09-18
summary: The org chart, what each role does, which screens they see, who approves what, and how access is requested.
---

# Roles and permissions

## 1. Org chart
```
Owner
├─ Admin (super admin in HoyOS)
│  ├─ Coordination
│  │  ├─ Front desk
│  │  └─ Teachers
│  └─ Finance
└─ Maintenance (reports to coordination day to day)
```
Today several people may cover more than one role. What does not change is who approves what.

> DECISION NEEDED: the names of the people in each role and front-desk coverage hours per shift.

## 2. The system's roles
{{roles}}

## 3. Responsibilities and screens
| Role | Responsible for | Main screens |
|---|---|---|
| Owner | Vision, prices, policies, contracts, pending decisions | M-01, M-08, M-07, M-09 |
| Admin | HoyOS configuration, switches, integrations, team users | M-01, M-08, M-03 |
| Coordination | Schedule, teachers, substitutions, events, content, automations, quality | M-02, M-04, M-05, M-06, S-06, C-02 |
| Front desk | Door, check-in, counter sales, payments, WhatsApp and email during hours (`13`) | S-02, S-06, S-04, M-06 |
| Finance | Reconciliation, payroll, electronic invoicing, refunds, reports | M-09, M-01, M-07, M-06 (Payments; reads the conversation, does not write) |
| Teachers | The class: before, during, after; attendance; their profile | S-03 |
| Maintenance | Cleaning, room setup, supplies, equipment, physical safety | the `07` checklists |

## 4. Who approves what
| Decision | Proposes | Approves | Recorded in |
|---|---|---|---|
| Price or plan change | Admin / finance | Owner | the value model · M-07 |
| Policy change | Coordination | Owner | M-08a |
| Cash refund | Front desk / finance | Finance (≤ 1 class) · Owner (larger) | M-06 Payments · M-07 |
| Courtesy credit return | Front desk | Coordination | M-06 note + M-07 |
| Cancelling a studio class | Coordination | Coordination (informs owner) | M-02 Schedule · E-03 |
| Teacher substitution | Teacher | Coordination | M-02 Schedule |
| Publishing a teacher profile or description | Teacher (S-03) | Coordination | M-02 review flow |
| Approving the month's payroll | Finance | Owner | M-09 · M-07 |
| A space rental | Coordination | Owner | M-02 + M-06 note |
| New team user or role change | Coordination | Admin | M-01 |
| Turning features on/off | Admin | Owner | M-08b |

## 5. Who opens the inbox and who writes
| Role | Inbox S-06 | Conversation in M-06 | Write (WhatsApp, email, note) |
|---|---|---|---|
| Owner / Admin | yes | yes | yes |
| Coordination | yes | yes | yes |
| Front desk | yes | yes | yes |
| Finance | no | reads | no (the box shows disabled) |
| Teachers | no | no | no; a substitution request goes to coordination through M-05 |
| Maintenance | no | no | no |

The message bell only shows to whoever can open the inbox. Marking a message as read is a team act: any of these roles opening the thread clears it for everyone, and the record keeps who did.

## 6. Principles
1. Every action in HoyOS lands in **M-07 All activity log** with your name. Always work under your own
   user; never share a session.
2. If you lack a permission, do not work around it: ask admin. A permission asked for and recorded is
   safe; a shared user is not.
3. A super admin can "view as" another role to test a screen; that is logged too.

![Role home](../../screenshots/S-01/en-1280.jpg "S-01 · /staff")

## 7. Screens per surface
{{routes:admin}}

{{routes:teacher}}
