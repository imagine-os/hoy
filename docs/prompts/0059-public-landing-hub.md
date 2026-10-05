# Public landing, testing hub and login placeholder

Source: direct · 2026-10-05 · requester: owner

## Prompt

UI/navigation excerpt of the owner's request (domain-account access is handled separately):

“I think the way I want it is that the Oi website goes to the coming soon page. Anyone who knows to go to OiHumanClub.com slash hub gets to the hub, and from there they can test the experience. We don't need to make that password protected as of yet. I'll get you the Clerk account later for them to be able to log in via Clerk. I don't know if you want to place a placeholder module for login or what. You can maybe make it so that a pop-up comes up when they click login that says Coming Soon.”

## Response

Made the current deployment's root open Coming Soon, moved the existing public testing hub to `/hub`, and added a same-origin static entry for clean `/hub` visits and refreshes on GitHub Pages. The current `/coming-soon` and full `/site` routes remain available, including Latest and the animated archive. Login now opens a bilingual Coming Soon dialog with Close, Escape, browser Back and focus restoration. No Clerk service, credential collection, auth permission, DNS, CNAME or custom-domain configuration was added; domain ownership/account verification remains a separate prerequisite.
