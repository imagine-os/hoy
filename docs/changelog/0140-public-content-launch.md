version: 0.25.0
date: 2026-10-23
prompt: docs/prompts/0140-public-content-launch.md
intent: Repair public contact destination consistency and date-aware launch routing.
decision: Reuse Settings contact resolution, tenant timezone and existing website/auth handoff; isolate redirect in coming-soon module.
rejected: Duplicated contact settings, browser-local launch dates, auth changes and permanent redirect of the component-library preview.
files: src/modules/coming-soon/{launch.ts,pages.tsx,specs.ts}; src/modules/website/{SiteShell.tsx,pages/ContactPage.tsx,pages/HomePage.tsx}; scripts/test-public-*.mjs; .github/workflows/public-content-qa.yml; docs/frontend-completion/public-content-launch.md; docs/screenshots/public-content-launch; docs/kanban.md

W-11 redirects through the route wrapper; the existing ComingSoonLanding component and library usage remain available. W-01 uses the studio calendar when displaying today's agenda. W-06 and the public footer display the same configured front-desk number as their direct link. No new component or visual variant was introduced; existing D-02 components are reused.

[Verified criteria, interfaces, limits and screenshot links](../frontend-completion/public-content-launch.md). Source phases and acceptance statuses are unchanged. No deploy or full-row completion claim.
