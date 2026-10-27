# Native website cursor

The public website shell uses the browser's normal cursor. Links and buttons retain their existing pointer styles; text fields retain the native caret. Coming Soon already uses native cursor behavior. The shared ElementCursor component remains available in the component guide, separate from the public website shell.

`scripts/test-website-native-cursor.mjs <source-SHA>` checks the emitted release manifest, pointer movement, native link/button styles, keyboard focus, route/back navigation, text fields, touch navigation, reduced motion and all four website editions. It accepts `WEBSITE_BASE_URL` and `CURSOR_OUTPUT` for built-preview and live verification. The regression fails on the previous website, which mounted the decorative dot/ring and hid the native pointer.

This presentation change keeps the existing page layouts, CMS data contracts, media overrides, fixtures and repository adapters. The build, route-map drift check and website regressions remain release gates. Screenshots exclude the operating system pointer; runtime DOM/style assertions verify native cursor behavior.
