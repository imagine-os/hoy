# Roles

| Role | Surface | Layout | Notes |
| --- | --- | --- | --- |
| `super_admin` | everything | desktop | Only role that can turn **dev mode** on and "view as" another role. |
| `admin` | admin, staff | desktop | Studio owner / general manager. |
| `coordinator` | staff, admin subset (content, schedule, CRM) | desktop | Runs the daily operation. |
| `front_desk` | staff (check-in, register) | desktop | Counter work. |
| `finance` | admin subset (payments, invoices, payroll) | desktop | Read-mostly on operations. |
| `teacher` | teacher app | mobile | Own classes, attendance, payroll view. |
| `maintenance` | staff subset (rooms, incidents) | mobile/desktop | Facility tasks. |
| `customer` | customer app | mobile | Members and drop-ins. |
| `public` | website | auto | Not signed in. |

Permissions are strings (`bookings.write`, `tables.read`, …) mapped per role in
`src/auth/permissions.ts`. `useSession().can('x')` checks them. `RequireRole` guards routes and
redirects to `/#/no-access` with a friendly message.

## Demo users
One fictional person per role in `src/auth/demoUsers.ts`. The hub and the `RoleSwitcher` component
switch between them; the choice persists in localStorage under `hoyos.session`.

## Dev mode and view-as
A super admin can toggle **dev mode** (spec chip, inspector `Ctrl+.`, layout editor links) and pick
**view as** any role to see that role's experience with or without dev tooling.
