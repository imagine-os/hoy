# Optional class description

User instruction: "Do the work please."

Context: add one optional template-level class description, including existing published classes via their existing links. No per-date overrides, class recreation or changes to existing schedules/bookings. Do not populate real records for testing. Keep the separately pending PR160 out of this change.

## Response

Added one optional plain-text field to the existing production editor and connected its read mapping to the existing inherited description renderer. Blank uses the class-type fallback. Existing linked dates need no rewrite. Fictional model/UI tests and release reviews verify the scope; backend metadata/public-read configuration is required before rollout.
