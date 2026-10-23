version: 0.25.0
date: 2026-10-23
codes: A-02, A-03, C-04, C-19
prompt: docs/prompts/0172-remote-demo-signout.md
intent: Close already-open private demo tabs when another tab signs out or removes the session key.
decision: Accept only current persisted public-session or key-removal storage events. Ignore ordinary nonpublic persona/view-as changes, malformed payloads and older queued logout events. Synchronously reset the local demo session and remount its consumer subtree so pending signup/checkout cleanup invalidates the old attempt, including an already-public signup.
rejected: Cross-tab persona synchronization, role or permission changes, provider configuration changes and claims of real token revocation.
files: SessionProvider logout reaction; isolated actual-page context harness and focused two-tab tests; documentation.

The outer data provider and persisted history remain intact. Explicit remote logout clears mounted in-memory drafts. Transactions already committed retain their records; an old acknowledgement cannot restore the session or confirmation UI. This is browser demo behavior only: real identity sessions, email delivery and server authorization remain separate integration gates.
