# Hoy all roles: the Company OS test seed names its rooms and products, and its people sign in

Prompt intent: test-hoy's made-up studio should load completely (Hoy all-roles Wave 1, lane A2). Its packs need their products and its classes their rooms, and it needs one login per role for view-as and the access walk.
Decision: `scripts/seed-companyos.ts --recipe-refs` now also names each class's room as `{ "$ref": { "entity": "resource", "where": { "name": "Main room" } } }`. The sample's rooms map to the recipe's by name (`ROOM_OF`), and a recipe without that room is refused. It already named products by `key` this way. Company OS's loader resolves these refs and creates a login per `memberships` entry. The seed in Company OS is regenerated with `--recipe-refs`. Classes still name no schedule, because the recipe's schedules are placeholders, not Hoy's timetable.
Alternative rejected: linking each class to a recipe schedule by weekday. That would tie Hoy's timetable to the placeholder rows ("Morning flow" at 07:00).
Files: `scripts/seed-companyos.ts`, `scripts/test-seed-companyos.mjs`.
