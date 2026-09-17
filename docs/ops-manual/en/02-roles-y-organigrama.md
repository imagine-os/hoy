---
title: Roles and org chart
role: everyone
version: 0.1
updated: 2026-09-17
---

# Roles and org chart

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

## 2. Responsibilities and screens
| Role | Responsible for | Main screens |
|---|---|---|
| Owner | Vision, prices, policies, contracts, decisions marked as pending | M-01, M-08, M-07 |
| Admin | HoyOS configuration, feature switches, integrations, team users | M-01, M-08, M-03 |
| Coordination | Schedule, teachers, substitutions, events, content, automations, service quality | M-02, M-04, M-05, M-06, C-02 |
| Front desk | Door, check-in, counter sales, payments, WhatsApp during opening hours | S-02, S-04, M-06 |
| Finance | Reconciliation, payroll, electronic invoicing, refunds, reports | M-01, M-07, M-06 (Payments tab) |
| Teachers | The class: before, during, after; attendance; their profile | S-03 |
| Maintenance | Cleaning, room setup, supplies, equipment, physical safety | Paper checklists or `07` |

## 3. Who approves what
| Decision | Proposes | Approves | Recorded in |
|---|---|---|---|
| Price or plan change | Admin / finance | Owner | M-02 Pricing · M-07 |
| Policy change (cancellation, claim, grace, fee) | Coordination | Owner | M-08 |
| Cash refund | Front desk / finance | Finance (≤ 1 class) · Owner (larger) | M-06 Payments · M-07 |
| Courtesy credit return | Front desk | Coordination | M-06 note + M-07 |
| Cancel a studio class | Coordination | Coordination (informs owner) | M-02 Schedule · E-03 |
| Teacher substitution | Teacher | Coordination | M-02 Schedule |
| Publish a teacher description or profile | Teacher (S-03) | Coordination | M-02 review flow |
| New team user or role change | Coordination | Admin | M-01 |
| Turn features on/off | Admin | Owner | M-01 |

## 4. Handoffs
1. Front desk → Coordination: incidents, complaints, pause requests outside the rule, repeated no-shows. Leave a **note in M-06** with a category and post in the internal group.
2. Front desk → Finance: daily cash close, pending payments (unconfirmed transfers), refund requests.
3. Teachers → Coordination: attendance outside the window (after T+2h), substitutions, injuries observed.
4. Coordination → Owner: pending decisions, policy changes, weekly results.
5. Anyone → Admin: access, permissions, anything HoyOS will not let you do.

## 5. Principles
1. Every action in HoyOS lands in **M-07 All activity log** with your name. Always work under your own user; never share a session.
2. Front desk sees the member timeline but cannot edit payments; finance sees payments but not health notes. If you lack a permission, do not work around it: ask admin.

> DECISION NEEDED: names of the people in each role and front desk coverage hours per shift.
