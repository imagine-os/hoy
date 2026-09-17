# 0014 — Jas's design review (2026-09-17)

- **Source**: Justin in the Slack thread, relaying Jas's review document (PDF) with annotated screenshots
- **Date**: 2026-09-17
- **Requester**: Justin (project lead) · reviewer: Jas (design)
- **Changelog**: `docs/changelog/0014-jas-feedback-0917.md`

## Prompt (verbatim)

> here are some feedback from Jas. Please make sure that You study the screenshots in the proper order. In relation to the content and suggestions, she's providing in the document. And you'll notice that in some cases, she actually annotated on the screenshot. Please apply her suggestions

and, in the same thread:

> i think she had some questions that I need to ask sergio. Please tell me what those are in english. So I can forward the message accordingly if needed

## Jas's points (verbatim, from the review document)

**Cliente**
> Agregar fecha de inicio del Plan – Fecha final

> Pregunta para Lore: ¿Es importante tener el dato del sexo de los clientes?

**Horario**
> Agregar Sin Cupos disponibles o "Full"

**General**
> Preguntarle a Sergio si los pagos para los profesores serán quincenales o mensuales para que esa sea la unidad de tiempo para los pagos de nómina e informes contables

**Recepción**
> Agregar campo de valor pagado: por defecto debería ser igual al valor facturado pero puede suceder que se le esté dando un descuento especial o alguna situación no prevista y se cambie el valor. Cuando eso pase debería surgir un campo para guardar la observación

**Métodos de pago**
> Quitar ese aviso del 19%. No es costumbre tenerlo explícito en la pantalla de pagos

**Página web oscuro**
> no se ve

(annotated over the "Cuatro movimientos" card titles)

> Quitar la palabra "claros"

**Panel admin**
> Preguntarle a Sergio si el Coordinador ve el KPI de ingresos totales mensuales

> Pregunta para Lore: ¿Se ha pensado un producto que sea una sesión grupal para celebrar cumpleaños o algún evento? Que la gente quiera reservar espacio, profe y se le adiciona algún detalle

**Administrador**
> Falta agregar la página de revisión de liquidación: para ver el detalle de pagos a los profesores, cantidad de clases dadas y marcar cuando efectivamente se hizo el pago

> Agregar la opción de registrar gastos quincenales recurrentes fijos y gastos variables de manera que se pueda tener un balance total de las finanzas de Hoy

> En caso de que Sergio estipule periodos quincenales de pago, se debería agregar acá "15 días"

## Response

Six points were assigned to this worker; four were built here and two were handed to the concurrent website
workstream, which was already rewriting `src/modules/website/**` on the same day.

**1 · Plan start and end date (C-06 "Tu plan" card).** The card Jas annotated — heading "Membresía", notice
"Tu plan: Plan Mensual · Activa" with "Gestionar membresía" — is the `Notice` at the top of C-06
(`src/modules/customer/pages/PlansPage.tsx`), not C-22. No schema change was needed: `memberships` already
carries `starts_at`, `renews_at` and `ends_at`, and the seed fills them. The notice now shows
**Inicio del plan** / **Fin del plan** (EN "Plan start" / "Plan end") under the status, formatted with the app's
`formatDate()` at the ES/EN locale and with the year included (an annual cycle ends in another one). "Fin del
plan" is the cancellation date when one is set, otherwise the end of the paid cycle (`renews_at`).

**2 · "Sin cupos" on a full class row (C-02, C-01).** `ClassRow` now derives `full` (`booked >= capacity` on a
scheduled session) and, in that case, shows a danger `Badge` reading **Sin cupos** / EN **Full** where the
"4 cupos" capacity meter used to sit — the same pill family as the existing "Reservada" badge, no new tokens.
Booking is unavailable on a full row: on C-02 and C-01 the row now leads to the existing waitlist (C-20,
`/app/waitlist/:id`) instead of the booking action. `core.common.full` ES changed from "Lleno" to "Sin cupos" so
the week grid, check-in and the pill all say the same thing. `ClassRow.meta.ts` already listed `full` among its
states and now documents and renders it. The seed guarantees one **upcoming class today is full** (deterministic,
after the random pass, so the rest of the demo data does not shift), with a waitlist row behind it.

**3 · "Valor pagado" + "Observación" (S-04).** The Resumen rail gained a **Valor pagado** (EN "Amount paid")
field that defaults to the invoiced Total and follows it while untouched. When the desk types a different value,
the difference is shown and a required **Observación** (EN "Note") field appears; "Completar venta" stays
disabled until it has text. The default path is unchanged and still one click. Both values are persisted on the
payment: `payments.amount_paid` and `payments.note` were added to `src/data/schema.ts`, `supabase/schema.sql` and
`docs/data-model.md`, and they are also written by the seed, by the customer self-serve path and into the audit
entry for the sale.

**4 · IVA out of the C-05 subtitle.** The Métodos de pago subtitle is now "Medellín · COP" in both languages.
The receipt and POS maths are untouched: S-04 still splits IVA from `settings.tax` and the invoice still stores
`subtotal` / `tax` / `total`.

**5 · Website dark mode, "Cuatro movimientos" titles** — **handed to the website workstream**, which holds
`src/modules/website/**` on its branch and has the contrast fix there.

**6 · "Planes claros" → "Planes"** — **handed to the website workstream** (same file set:
`src/modules/website/strings.ts` plus the ops-manual/website copy occurrences).

**Not in this worker's scope** (they belong to the concurrent finance workstream and are coordinated with it):
the payroll settlement review page, recurring fixed / variable expenses with a total balance, and the "15 días"
period filter. They are logged in `docs/kanban.md` as open items with `owner: finance workstream / pending Sergio`.

### The questions for Justin to forward (in English)

Four of Jas's notes are questions, not work. They are recorded in `ROADMAP.md` §E as pending owner decisions:

1. **For Sergio** — Are teachers paid **fortnightly or monthly**? That interval becomes the unit of time for
   payroll runs and the accounting reports, and it decides whether the admin pages get a "15 days" period filter.
2. **For Sergio** — Should the **Coordinator** role see the **monthly total-revenue KPI** in the admin panel, or
   is that limited to admin/finance?
3. **For Lore** — Do we need to store the **customer's sex/gender**? Nothing collects it today, so it would be a
   new profile field (and a new question at the desk).
4. **For Lore** — Has a **group-session product for birthdays or events** been considered — people book the room
   and a teacher, with an add-on detail? Today only the fixed class timetable and the events calendar exist.
