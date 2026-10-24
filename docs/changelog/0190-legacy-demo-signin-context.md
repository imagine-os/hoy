version: 0.25.0
date: 2026-10-24
codes: A-02, E-04
prompt: docs/prompts/0190-legacy-demo-signin-context.md

# 0190 · Cancel obsolete legacy demo sign-in callbacks


A delayed legacy demo sign-in could restore the demo customer after another tab signed out. The old form had already unmounted, but its callback still changed the session and navigated.

The legacy form now retains one in-memory request and timer, captures the exact form and provider/session/route context, and cancels obsolete work on context change or unmount. A callback that was already queued checks its request again before changing the session, failed-attempt state, lock state or navigation. A fresh explicit submission still uses the existing demo entry behavior.

The existing code/Google preview, demo picker, role permissions and real-auth integration boundaries are unchanged. No credentials are stored, and no email or OAuth service is enabled. Replacing SessionProvider or changing authentication policy was rejected because the defect belongs to this delayed form callback.

Changed: `SignInPage.tsx`; focused actual-page timer/context regression and development-only fixture.

Validation: syntax checks and 22 actual-page regression groups passed. These cover native cross-tab logout in Spanish/English at mobile/desktop widths, a dark-theme case, queued callbacks after cancellation, valid retry, existing code/Google expiry and lockout states, actor/role/provider/route/query/form changes, protection of a newer pending request, and unchanged financial history. Full project type/build and compiled checks remain integration gates. Integration owns the shared kanban, CI wiring and final release checks.

The locked-page copy now describes the browser-only demonstration. It does not claim an email notification or a server-enforced account lock. Existing attempt counts and timing rules are unchanged. Dedicated CI retains development context tests and separate compiled logout/lock regressions.
