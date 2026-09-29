---
title: Roles and permissions
role: everyone
part: VII
version: 0.13.2
updated: 2026-09-29
summary: The org chart, what each role does (marketing and developer included), which screens it uses, who approves what and how to ask for access.
---

# Roles and permissions

Everyone signs in with their own user and their role. The role decides what you see, what you can change and which
chapters of this manual show up first for you.

{{audience:24-roles-y-permisos}}

## 1. Org chart
```
Owner
├─ Admin
│  ├─ Coordination
│  │  ├─ Front desk
│  │  └─ Teachers
│  ├─ Finance
│  ├─ Marketing
│  └─ Developer
└─ Maintenance (reports to coordination day to day)
```
Today one person may cover more than one role. What doesn't change is who approves what.

> DECISION NEEDED: the names of the people in each role, and which receptionist covers each part of the day.

## 2. The roles in the system
{{roles}}

## 3. What each role does
| Role | Responsible for | Where they work |
|---|---|---|
| Owner | the vision, prices, policies, contracts, pending decisions | Dashboard, Settings, Activity, Finance |
| Admin | HoyOS configuration, features, integrations, team users | Dashboard, Settings, Tables |
| Coordination | schedule, teachers, substitutions, events, content, automated messages, quality | Content, Emails, WhatsApp, CRM, Inbox, schedule |
| Front desk | the door, check-in, sales, payments, WhatsApp and email during desk hours | Check-in, Inbox, Register & pay, CRM |
| Finance | reconciliation, payroll, invoicing, refunds, reports | Finance, Dashboard, Activity, CRM payments |
| Teachers | the class, before, during and after; attendance; their profile | the teacher app |
| Maintenance | cleaning, set-up, supplies, equipment, safety | the checklists in [Room](07-sala-calor-y-mantenimiento.md) |
| Marketing | content, social media, the brand kit, campaigns | Content, the website, [Part V](18-web-y-redes.md) |
| Developer | developer tools, documentation, specs, integrations | developer tools, Documentation, Integrations |

**What applies to marketing:** the chapters on content ([17](17-cms-y-contenido.md)), web and social
([18](18-web-y-redes.md)), media and the logo ([19](19-medios-y-artwork.md)) and voice and tone
([20](20-voz-y-tono.md)), plus the value model ([03](03-modelo-de-valor.md)) so nothing is advertised that doesn't
exist. The marketing kit is coming soon to the hub.

**What applies to developers:** roles ([24](24-roles-y-permisos.md)), data ([25](25-datos-y-tablas.md)) and
integrations ([26](26-integraciones.md)), plus the software documentation, each screen's specs and the developer
tools.

## 4. Who approves what
| Decision | Proposed by | Approved by |
|---|---|---|
| A price or a plan | admin or finance | owner |
| A policy | coordination | owner |
| A cash refund | front desk or finance | finance (up to one class's value) · owner (more) |
| Giving back a credit as a courtesy | front desk | coordination |
| Cancelling a studio class | coordination | coordination (and tells the owner) |
| A teacher substitution | the teacher | coordination |
| Publishing a teacher's profile | the teacher | coordination |
| Approving teacher pay | finance | owner |
| A space rental | coordination | owner |
| A post with prices or promotions | marketing | owner |
| A new user or a role change | coordination | admin |
| Switching features on or off | admin | owner |

## 5. The Inbox: who opens it and who writes
| Role | Inbox | Member conversation | Write (WhatsApp, email, note) |
|---|---|---|---|
| Owner and admin | yes | yes | yes |
| Coordination | yes | yes | yes |
| Front desk | yes | yes | yes |
| Finance | no | read only | no |
| Teachers | no | no | no; a substitution is requested from coordination |
| Maintenance, marketing and developer | no | no | no |

The message bell only appears for people who can open the Inbox. When someone opens a conversation it is read for the
whole team, and who opened it is saved.

## 6. Principles
1. Everything you do is recorded under your name. Always work with your own user and never share the session.
2. If you're missing a permission, don't work around it: ask admin. A permission asked for is safe; a shared user
   isn't.
3. A super admin can "view as" another role to test a screen. That is recorded too.

![Home by role](../../screenshots/S-01/en-1280.jpg "S-01 · /staff")

> IN HOYOS: S-01 Home by role · M-01 Dashboard → team users (admin) · "view as" picker (super admin).

## 7. Screens by surface
The admin and teacher screens:

{{routes:admin}}

{{routes:teacher}}
