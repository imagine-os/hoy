# HOY Wompi isolated checkout verification

This is a standalone Node 24 verification harness, not the Hoy OS production or shared test entry point. It binds to the existing isolated Railway service only and exclusively accepts Wompi test-prefixed credentials. It does not mount real Clerk users, Company OS, bookings, mail or webhooks. No secrets belong in these files.

Run `node --test scripts/wompi-sandbox/*.test.mjs scripts/wompi-sandbox/hosting/*.test.mjs` from the repo. Results exercise the actual HOY HTTP gate, both operator credentials, a server-priced 55,000 COP quote and synthetic provider approval, decline, cross-operator denial, replay, expiry and wrong-environment rejection.

Readiness before any hosted run: record independent security/release review on the exact source and deployment target; keep the service disconnected from branch-triggered deployments and from the existing Hoy OS project. Generate a dedicated HTTPS Railway service domain, put operator secrets directly in the sandbox service, and set a close deadline no more than one hour ahead. Use one replica, no retries after shutdown, and no durable storage. Verify the exact origin and expiry and remove the domain and stop the deployment afterward. The in-memory results intentionally do not survive a restart.

Run separate approval and decline cases with official Wompi sandbox data and the operator in control of checkout consent. Confirm MODO DE PRUEBAS before submitting. Do not record card or payer fields in issue trackers or logs. No live charge, app rollout, or other project changes are authorized by this verification procedure.
