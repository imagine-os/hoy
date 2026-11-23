# User request, November 23, 2026

Hoy (Jas, relayed by Justin and by email): Hoy is launching a product that is X classes for X price. The purchase
should generate a code that can only be used for one booking, but that booking should give access to X people. If
someone buys a 4-person pack, they get one code, book one class with it, and 4 people can attend that class. After
that, the code can't be used again.

# Group pass, the Hoy site (Company OS ADR 0045, lane L2)

Request: sell a group product, issue one code on approval (Company OS), let the code book one class for its group,
let each person take their own place, and let the desk add and swap people until check-in closes.

Decision: the site only builds the writes and shows the results; Company OS decides the code, the class, the room for
the group, the places left and the person limits (ADR 0045). Administration creates group products (kind `group`,
`places` ≥ 2) in Products; members buy them on the pay page like a pack and the desk sells them without a class.
Members see their codes in More › My group passes (`/app/group-passes`, C-43) and share `/#/app/pass/<code>` (with
`?c=<class>` after the first booking); the join page (`/app/pass/:code`, C-44) books one place per signed-in person
with `entitlement: pass` and `pass_code`. The desk roster (S-02) groups a party ("N of X places named"), adds a person
with the code read from the voucher and swaps a named person (PATCH `person`). Private classes are not timetable
classes at Hoy (no class type for them; a private class is a quoted product), so the join page's picker lists the
timetable's classes. Requires Company OS >=1.23.0.
