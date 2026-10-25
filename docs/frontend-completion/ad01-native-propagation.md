# AD-01 native content propagation

Feature Log row 87; source row 88. Isolated from main `0e4a66310ab749e7851336df4d24dceb2b0bdb50`.

The public schedule drawer now resolves the selected class room from tenant-scoped room data. Previously an edited room still appeared as the fixed translated “Main studio” label. The existing fallback remains available when the linked room cannot be resolved.

`test-ad01-native-cycle.mjs` creates fictional teacher, room, class template and FAQ records through existing admin forms; edits them, generates one 50-minute occurrence, and exercises supported publication controls across website, customer and reception consumers. It selects an existing eligible fictional customer using the current admission/contact rules. Historical bookings, payments, ledgers, documents, messages, users, roles and waitlist remain byte-identical. The default matrix is EN/ES at 390/1280 pixels; an empty or invalid selection fails.

Fresh local development and compiled-preview matrices each passed four groups, 116 observations, zero defects and zero runtime errors. Retained domain gates passed 58 recovery groups, 22 actor/context groups, content-batch checks and 50 admission assertions/groups. The CMS checker and its 24 negative cases, TypeScript, full build and unchanged public-tracker regression passed. The original room-label failure is retained outside the public repository. The CMS inventory records actual page/entity dependencies and synthetic fixtures; it does not connect a backend or add persistent table preferences.

## Acceptance limits

This is a bounded AD-01 slice. Rooms have no publication field/control. Reception has no FAQ consumer and does not display room/theme in its selected-class view. Mounted stale-response/error handling remains a separate dependency on held AD-07 work, rather than a claim established by these navigation-based checks. No whole-criterion readiness, real backend synchronization, timer/release policy, financial mutation or message sending is asserted. Merge and deployment remain held.

Run `npm run check:cms`, `node scripts/check-cms-contracts.mjs --self-test`, `npm run build`, the retained content/admission domain suites and the native script against the built preview. CI runs the same default four-group browser matrix.

Reviewed synthetic development captures: [Spanish mobile](evidence/ad01/es-390-site-edited-detail.jpg), [English desktop](evidence/ad01/en-1280-site-edited-detail.jpg).
