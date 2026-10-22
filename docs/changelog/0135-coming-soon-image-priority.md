version: 0.25.0
date: 2026-10-22
prompt: docs/prompts/0082-frontend-continuation.md

# Preserve image priority without React18 unknown-prop warning

ComingSoonLanding passed fetchPriority in camel case, which the installed ReactDOM18.3.1 development runtime does not recognize. Its image now emits the lowercase native fetchpriority="high" attribute through a narrowly typed spread. All image/art/layout values, public routing and the Coming Soon Login placeholder are preserved.

Files: ComingSoonLanding.tsx; focused actual-route browser test; frozen original-image JSX/attributes/asset hashes; batch46 follow-up and source hash manifest. Alternative rejected: upgrade React, remove the priority intent, filter console warnings or alter launch behavior. Source writing only: compiler/build/dev/production QA remain UNRUN pending coordinator lane. SW-08 and NT-01 phases/statuses/acceptance are unchanged. See docs/frontend-completion/batch-46-image-priority.md.
