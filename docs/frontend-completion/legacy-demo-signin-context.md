# CU-04 · Feature Log 28 · source row 29

A queued legacy demo callback could restore the customer after another tab signed out and the original form had unmounted. One scoped timer/request now invalidates obsolete work before changing the session, failed-attempt counter, lock or route. Raw form values remain in memory only. Existing code/Google previews, explicit demo picker and policy values are preserved.

The development suite covers 22 actual-page/context configurations, including valid retry and protection of a newer pending timer. The separate legacy-lock suite checks five active failed attempts, one increment per double press, the exact predeadline boundary, expiry cleanup and a fresh valid retry in EN/ES at 390/1280. Compiled logout and lock suites run separately from the development harness. The lock copy states that the countdown is a browser demonstration and that no email was sent or real account blocked.

Real identity-provider authentication, OAuth, email delivery, server rate limiting, credential recovery and global token revocation remain separate integrations. Source/test acceptance, full builds, compiled verification and release are distinct gates.
