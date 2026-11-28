# The group pass

Date: 2026-11-23. Codes: PR-01, C-06, S-04, C-43 (new), C-44 (new), S-02, C-08, C-28. Company OS ADR 0045.

Intent: Hoy sells one class for a group: one purchase gives one code, the code books one class once, and the X people
of the group each take a place (Jas, 23 Nov).
Decision: the site never counts places or checks the code; Company OS does (ADR 0045: payments 2.10.0 product kind
`group` and `places`, bookings 1.11.0 entitlement `pass` and the party stamps, credits 1.5.0 voucher kind `group`).
- Products (PR-01): kind *Pase grupal* with *Personas por pase* (a whole number from 2 to 100).
- Buying: the member pays a group product by transfer on the pay page (C-06 shows it as a card); the desk sells it
  like a pack, without a class (S-04), and shows the code the approval issued. No client voucher write: the code is
  issued by Company OS on approval.
- My group passes (C-43, `/app/group-passes`, from More): each code, its places, how many have a name, the class once
  booked, the validity, and the share link with a Copy button (`#/app/pass/<code>`, `?c=<class>` after the first use).
- Use a group pass (C-44, `/app/pass/:code`): a first use picks a class with room for the group and books it; with
  `?c=` the person takes their place in that class. Signed out, sign-in comes back to the same link.
- My bookings: a pass place reads "pase grupal"; it cannot move (cancel only).
- Check-in (S-02): group passes listed together with "N de X lugares con nombre"; the desk adds a person into an
  unnamed place and swaps a named person until check-in closes; check-in per person is unchanged.
- Refusal copy in Spanish and English for `pass_unresolved`, `pass_class_only`, `group_does_not_fit` (with the places
  needed and left), `party_full`, `voucher_wrong_kind`, `pass_occurrence_mismatch`, `pass_person_required`,
  `void_pass_used`, `voucher_kind_fixed` on every screen that can meet them.
- Group codes stay out of the gift and courtesy lists (M-13, S-08) and the redeem page (C-28 says what the code is for).
Review round 1 fixes: the screens' decisions are tested functions (passCard, joinView, joinFailure, joinMessage,
partyView, copyLink, groupSaleNotice, passCancelWarning); a spent pass (no active place left) or one whose class has
started shows no share link; the join page stays locked while an answer is unknown; a link shared before the first use
finds the pass's class from the server's details; the lead is warned that cancelling cancels the group's places and
loses the code; Products hides Classes for a group product and sends no credits; no group pass card on the public
website (owner, 2026-11-23), members buy it in the app's Plans.
Integrated round 1 fixes: the desk registers someone with no account into an unnamed place without selling anything
(person, member facet, verbal consents and the pass booking in one /batch, Q1); the join page says when a booking holds
the class for the whole group (a first use, or an old link after the pass was returned); a booked pass past its
valid_until keeps its link and its join while the class is ahead (Company OS decides until check-in closes).
Integrated round 2 fixes: the lead's cancel warning and the join page's rules say places already checked in stay, and
that the pass is not given back once the class has started or anyone has checked in, even if the studio cancels (owner,
2026-11-23); the test fake (`scripts/lib/fake-cos.mjs`) now matches Company OS as built (the lead's cancel cancels only
booked places, a voided pass answers `voucher_payment_not_approved`, only changes to or from kind group are refused,
void and expiry are the lead's checks, no return once the class started or anyone checked in).
Alternative rejected: one booking with X seats (Q8: X linked bookings keep capacity, check-in and the person rules).

Files: `src/modules/products/launch/{productMaster.ts,ProductMasterPage.tsx}`, `src/modules/products/strings.ts`;
`src/data/companyos/{mapping.ts,refusals.ts}`, `src/data/{schema.ts,livePricing.ts}`, `src/i18n/core.ts`;
`src/modules/vouchers/production/{groupPass.ts,GroupPassPages.tsx,model.ts,specs.ts,strings.ts}`,
`src/modules/vouchers/index.ts`; `src/components/molecule/{ShareLink,PartySummary}/*` (new, D-02),
`src/components/molecule/GenericPlanCard/*`; `src/modules/staff/{CheckinPage.tsx,desk/DeskSalePage.tsx,desk/deskCommands.ts,desk/strings.ts}`;
`src/modules/transfers/launch/{TransferPayPage.tsx,cos.ts,strings.ts}`; `src/modules/customer/{auth/customerReturn.ts,pages/MorePage.tsx,pages/BookedPage.tsx,strings.ts,booking/refusals.ts,booking/strings.ts}`;
`src/config/launchRoutes.ts`, `docs/route-connectivity.md`, `company-os.json` (`>=1.23.0`);
`scripts/test-group-pass.mjs` (new), `scripts/lib/{fake-cos.mjs,fake-credits.mjs}`, `scripts/test-companyos-provider.mjs`,
`scripts/ci/areas.json`, `package.json`.

Release: after Company OS 1.23.0 (and the Hoy recipe apply that lets members read group products and their own group
vouchers). Review build unchanged (the new pages are production only).
