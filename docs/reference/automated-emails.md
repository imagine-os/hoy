# Automated emails — inventory and gaps (0055)

Source: Lore's three inventories of 2026-10-02 (`WEBSITE`, `CUSTOMER APP`, `TEACHER APP` — *hoy automated emails*).
Built into M-04 (`/#/admin/emails`) as `src/data/emailCatalog.ts`: one `email_templates` row per email, with
`audience` (customer · teacher · studio) and `priority` (launch · first_60 · later). Every row starts as a draft
except the receipt, the only email the inventories say is sending.

## How the three lists map

The website and the customer app share one account, one backend and one inbox, so their customer emails are **one
set**. Each catalog entry lists the inventory rows it answers (`refs`): `web-e3` = website, existing #3;
`app-m1` = customer app, missing #1; `tea-m7` = teacher app, missing #7.

| Audience | Templates | Before launch | First 60 days | Later |
| --- | --- | --- | --- | --- |
| Customers (website + app) | 38 | 19 | 10 | 9 |
| Teachers | 33 | 14 | 13 | 6 |
| Team | 1 | 1 | — | — |
| **Total** | **72** | **34** | **23** | **15** |

Merges and splits:

- Website "Package running low" = app "Last class left / package used up" → `package_last_class` + `package_used_up`.
- Website "Membership paused / reactivated" = app "Package frozen / freeze ending" → `package_frozen` + `freeze_ending`.
- Website "Membership renewal" (existing #9) = app "Package expiring" → `package_expiring` (0051: no membership at launch).
- Teacher "Special confirmed / cancelled" → `special_confirmed` + `special_cancelled`.
- Teacher existing #1 (substitute request, WhatsApp to the coordinator) → `sub_request_coordinator`, audience *team*;
  the teacher's own confirmation is `sub_request_received` (tea-m13).
- Teacher "Reset code by email" is its own row (`teacher_reset_code`) so its copy and link point at the teacher app.
- Priority for the twelve existing customer emails: *before launch* (they are designed and only need connecting),
  except Birthday, which is marketing (*later*).

## Decisions the inventories leave open

1. **Membership or package?** The app inventory asks for "Upcoming charge" before a recurring membership charge
   (app-m7, first 60 days) and the website still names "Membership renewal". HoyOS has no recurring membership at
   launch (0051: the 12-class package, freezable). `upcoming_charge` is in M-04 as a draft; delete it, or confirm
   memberships are coming.
2. **Teacher channel.** All 32 teacher messages are "email or WhatsApp, to decide". Every WhatsApp one needs a Meta
   template approved before it can send, so the 14 before-launch ones need the decision first.
3. **Who is the coordinator?** The substitute request goes to "the coordinator" by WhatsApp, but no coordinator
   contact is set in M-08a yet (0047 follow-up), so today it has nowhere to go.
4. **Late cancellation.** "Booking cancelled by you" assumes the class goes back to the package. A cancellation
   inside the 12 h window loses the class, and the terms still say "Por definir". It needs a second variant once the
   rule is set.

## Missing from all three inventories

**Team emails (the biggest hole).** Only one message goes to staff. Nothing tells the team when:
- a corporate or private-event request arrives (`lead.corporate`): the company gets a confirmation, the front desk gets nothing;
- a teacher flags an error on the payroll draft (tea-m23 promises the flag) or a payroll draft is ready for finance to approve;
- a teacher submits profile changes for review (tea-m3 / tea-m16 assume the coordinator knows);
- an account deletion request comes in (M-11; Ley 1581 sets a 15-business-day deadline);
- a class is still not closed after the teacher reminder (an escalation to coordination);
- the reports go out: daily close for the front desk, weekly numbers for the owner, the monthly payroll summary
  (the 0048 follow-up "Report emails in M-04").

**Customer emails.**
- Account deletion **request received**: the lists only cover the completion. Ley 1581 expects an acknowledgement.
- **Email address changed**, sent to the old address. It is the security pair of "Password changed".
- **Payment pending** (PSE / bank transfer in Wompi stays pending before it approves or declines).
- **Event cancelled / changed by the studio**: only the class versions exist.
- **Waitlist joined** and **waitlist offer expired** (the spot went to the next person).
- **Private class / Special confirmed** to the customer who booked it: only the teacher side exists.
- **Gift card about to expire** unused (a gift package has the 90-day validity).
- **Terms or privacy policy updated**: needed once the terms' "Por definir" items are filled in.

**Teacher emails.**
- **Password changed** and **sign-in paused**: customers have them, teachers do not.
- **Send your availability** before the next month's schedule is built.
- If teachers are contractors (*prestación de servicios*), a monthly **social security (PILA) proof** reminder
  before payroll closes. Confirm with finance whether pay depends on it.

## Rules that apply to the whole set

- **Consent.** Birthday, How was your class?, Your guest came, We miss you and the email summaries are marketing
  (`category: 'marketing'`). They need the member's opt-in (`notification_prefs`) and an unsubscribe link. Today's
  footer only says "you receive this because you have an account".
- **Health data stays out of email.** The before-class heads-up (tea-m18) asks for injuries. The copy points to the
  roster in the app instead, because injuries are sensitive data under Ley 1581.
- **The DIAN invoice.** Once the e-invoicing provider is connected, the receipt has to deliver the electronic
  invoice (PDF + XML) to the buyer.
- **Nothing emits the triggers yet.** The runner (Supabase) has to emit each `trigger` and render the row. M-04
  edits, previews and test-sends; it does not send.
- **Sending domain.** Verify SPF, DKIM and DMARC for the sending domain before more than the receipt goes out
  (M-10 › Transactional email).
- **One event, one channel.** When an event has both a WhatsApp automation (M-05) and an email (class reminder,
  spot opened), decide whether both send or the member's channel preference picks one.
