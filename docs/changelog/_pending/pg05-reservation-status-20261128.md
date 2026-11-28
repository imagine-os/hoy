# Pending Payments: clarify class reservation status

PG-05 (staff Pending Payments, S-09) no longer labels a transfer as a purchase without space. A payment without a class reservation link says "No linked class reservation"; a claimed link with no readable hold says "Could not verify the linked reservation"; a readable hold without a usable deadline says "Linked reservation · Hold time unavailable." The existing waiting, expired, and frozen statuses stay distinct. These messages do not indicate class capacity.

The queue still reads only held bookings; no changes to permissions, payment decisions, booking creation or expiration. A transfer for a standalone product does not acquire a reservation. The selected-class trial flow still needs a separate server-side booking link.

Focused H-5 checks covered the fixture states and receipt freeze, decline and approval with fictional data. Production compilation and type checks passed. Browser assertions were added for ES/EN and 390px/1280px; local Chromium could not start because its executable was missing. Hosted verification remains pending.
