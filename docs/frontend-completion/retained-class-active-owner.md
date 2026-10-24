# Retained class purchase active-owner consistency

The existing active-owner invariant now applies after asynchronous saved-result proof reads and immediately before acknowledgement or uncommitted-marker release. Fresh execution also checks the current owner after checkout and before staged financial writes or candidate persistence.

The final check uses the mock provider's synchronous snapshot; missing, unavailable, ambiguous, foreign or inactive owners cannot produce a verified result or release a marker. Existing caller-context callbacks still apply. No persisted-role contract is introduced.

Synthetic regression coverage uses actual retained purchases and verifies unchanged payment, grant, booking and receipt history when a late owner change denies recovery or acknowledgement. Additional cases cover uncommitted discard, queued execution, post-quote owner loss, unavailable snapshots and valid active-owner recovery/acknowledgement/discard.

This is browser simulation behavior, not a server authorization or real payment guarantee. Full application build and native UI verification are integration gates, separate from the domain suite.
# Verification boundary

The synthetic domain suite retains the original 23 groups and adds 13 active-owner boundaries. Four separate compiled-page cases cover late deactivation during acknowledgement, marker preservation, no repeated financial work and successful acknowledgement after reactivation in EN/ES at 390/1280. The existing ten compiled purchase/recovery journeys remain a regression gate. No browser source/test import or production test API is added; the fault wraps only the actual mock instance inside the test browser.
