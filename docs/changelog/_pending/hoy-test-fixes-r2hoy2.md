# Hoy test-fixes: consent step for logins that hold the customer role but never signed up (lane r2hoy2)

Prompt intent: Company OS (r2co2, people 1.9.0) turned on `invitations_grant_signup_role` in Hoy's recipe. An invited staff login now holds `member` but has never signed up, so it never accepted the studio's terms and privacy policy. `GET /t/:t/signup` says so with `registered: false`, and `POST /t/:t/signup` completes on the same login, person and facet. Hoy enrolled only logins without `member`, so these logins went straight into the customer area without accepting anything. The owner also asked for a test that a platform operator is enrolled like any other login.

Decision:
- RequireRole checks the customer area for any login holding the customer role (`consentCheckApplies`). The check never runs in a preview frame, while viewing as, or in a tab that still holds a view-as value. When `GET /signup` says `registered: false`, the page shows the enrolment's consent step (`CustomerEnrolment` with `consent`; same title, documents and button, no "join" wording), then posts the sign-up: name only, `facet: {}`, the accepted documents. A 201 or a `409 already_registered` with `/me` holding the role is success. `consent_required` asks again for the current versions. Other codes have their own es/en lines (`identity.accept.*`, plus `identity.signup.emailLinked` / `personLinked`) and never show a raw code. If the person's home is the customer area, the step offers sign-out instead of a link back to itself.
- Read once per login and tab (`src/auth/signupStatus.ts`), and shared when two pages ask at the same moment. After a successful sign-up the check passes for the rest of the session. A reload reads again.
- Fail open: a network error, an error status, an older Company OS without `registered`, or no answer within 4 s opens the page as before, and a `[signup]` warning goes to the console. Why: Company OS doesn't gate on the consent (its tech-debt #74), so a failed read must not lock a paying customer out of their bookings. The next session asks again.
- Desk-invited customers also read `registered: false`, and they get the same step (the default): Company OS's rule is that every customer accepts the current documents once. For them it shows once, on their next visit to the customer area.
- Independent of `CUSTOMER_AUTO_ENROL_STAFF`: the switch decides whether staff become customers, and these logins already are customers. The step shows in both states, and both are tested.
- Platform operator (owner 2026-11-01): their own login has no Hoy membership (`/me` 403), so it takes the studio's sign-up like any new login. Afterwards `/me` reads `member` only, and they are a customer here. Tested in the UI and in the unit tests.

Alternative rejected:
- Asking only staff logins (the contract's narrower option): this keeps desk-invited customers without a recorded consent. Rejected because Company OS requires every customer to accept.
- Blocking the customer area until the read answers, with no timeout, or keeping it closed when the read fails: one Company OS hiccup would lock customers out. Rejected for a 4 s wait that fails open.
- Rendering the page while the read is out and swapping in the step afterwards: the step would replace a page the person had already started using. Rejected.

Files: `src/auth/{signupStatus.ts (new),RequireRole.tsx,CustomerEnrolment.tsx,companyOsIdentity.ts,purchaseEntry.ts}`, `src/modules/identity/strings.ts`, `scripts/test-{auth-identity,auth-production-ui,view-as-ui}.mjs`, `docs/kanban.md`.
Pages: C-xx (customer area guard, consent step), CU-01/CU-02 (sign-up, consents).
Version: pending (merged with the `hoy-test-fixes` release; it uses Company OS people 1.9.0's `registered`, and an older Company OS fails open, so `company-os.json` is unchanged).
D-02: no component-library change (the step reuses the enrolment page, `ConsentCheck`, Card, Notice and Button).
