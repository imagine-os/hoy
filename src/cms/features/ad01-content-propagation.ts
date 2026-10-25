import type { CmsFeatureContract } from '../contracts';
// Bounded frontend propagation contract; see documented unsupported surfaces.
const feature = (
/* cms-data:start */
{
  "id": "ad01-content-propagation",
  "revision": 2,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "AD-01 FeatureLog87/source88: bounded fictional local content inventory, not whole-criterion readiness. Existing route roles/content.write guards remain unchanged. Actual M-02 modes: DataTable/cards and entity Drawer; M-02b: section/review list and Drawer; M-14: calendar/list/DataTable and Drawer. views=[] because local view switches/search are not persisted TableViewConfig preferences. Consumers are calendars/cards/FAQ lists/roster; no forced TableTool adoption. Rooms now have a browser-only prospective active publication state: missing legacy is published, new drafts unpublished; existing class admission and historical references stay unchanged. Reception still has no FAQ consumer or class room/theme display. S-04/S-05 room-selection consumers are scoped separately. Legacy specEntities are bound exactly, including legacy memberships/plans/tenants in S-02; class_templates/class_ledger consumer dependencies beyond legacy specs are declared separately. Local events only; backend mapping pending, no new policy/auth/timer/release guarantee.",
  "sources": [
    {
      "path": "scripts/room-publication-fixture.mjs",
      "sha256": "a4970100fe5adce2dd3b03defc3162595f81f89d50c46f267ada8cfd9976a96e"
    },
    {
      "path": "scripts/room-publication-harness.tsx",
      "sha256": "4cbe9e34fd834dec5f7be79c59d6525b473d584549c8ffe6f0720c8b3466bcd4"
    },
    {
      "path": "src/components/organism/ClassCard/ClassCard.tsx",
      "sha256": "64bd8264828d3b3fbbe4e4727bee69f5d4214b01fb86f2bf2cf6d17e944fc550"
    },
    {
      "path": "src/components/organism/SessionCalendar/SessionCalendar.tsx",
      "sha256": "d674d79766e669e4669662281b736f0f518e5f744d6e5ba9dd3f4f9352d49e7c"
    },
    {
      "path": "src/data/bookingContact.ts",
      "sha256": "1225c53d18134aa29e830bd79e76ba2765d6838e3e2b10736b4ed78bc689c8fb"
    },
    {
      "path": "src/data/classRecurrence.ts",
      "sha256": "4ed87836d58fc39a1f4c2933d3d7e3b0ab8af7fa4a30fe44a3eb1d17cd962839"
    },
    {
      "path": "src/data/contentBatch.ts",
      "sha256": "21d26863b6585131a409e992e056692fe7f4a316ecd88aa5e5dad994f3667294"
    },
    {
      "path": "src/data/dailyAdmission.ts",
      "sha256": "c77aa3e516ab1ef07b5f095fc7b1aea58f3dac83311cdd3a355dc160caed4823"
    },
    {
      "path": "src/data/DataContext.tsx",
      "sha256": "3a161e57f0c9548e111e8e99ec714a2ab153507ae7180db66ad95839ac324f15"
    },
    {
      "path": "src/data/MockProvider.ts",
      "sha256": "b24e5770850283445b9cdf1dc71ed1a159ab864aa811287f439c38ec26ca54cd"
    },
    {
      "path": "src/data/roomPublication.ts",
      "sha256": "d3f9f38ff4091eac68ff1776b6ff0f721cdf7044dbd4009afdfbd9ac49de9fcc"
    },
    {
      "path": "src/data/schema.ts",
      "sha256": "66b229b0d71c70f3b187dac584338142a21536c5f2a21aa4588af6e555e1975a"
    },
    {
      "path": "src/data/sessionAdmission.ts",
      "sha256": "16d15c7d0abf2dbff7828027282987d3970d34bf63cf1cbc1ede18d3dd7ad82d"
    },
    {
      "path": "src/data/sessionAvailability.ts",
      "sha256": "e522714e1c2642b3b312834e6f62e19222d25a0de61e0a9e9630eb9042386ebd"
    },
    {
      "path": "src/data/sessionEditorial.ts",
      "sha256": "46e6551359cb4fe47b29c3d1b75e6948f72f42ec9dbddb01bb07ebd68dd8aa6d"
    },
    {
      "path": "src/data/types.ts",
      "sha256": "e61845cd49fd4bf4625deeb46b6993c8023d2a077e416c0c6cca38b2cd80b5af"
    },
    {
      "path": "src/i18n/format.ts",
      "sha256": "3115d284da4bd9ff92b11e90d49eea3b859b15cbe8c84ebf40d88dc0c476f976"
    },
    {
      "path": "src/modules/admin/contentNav.tsx",
      "sha256": "a432792177a313999dae2c021a1dd2e5e2c05d0557d3529f7e8381eb23d4a184"
    },
    {
      "path": "src/modules/admin/ContentPage.tsx",
      "sha256": "2146e5be7549f90c9464702543aa132c4a616cc4378aeb272f93c8cf018be874"
    },
    {
      "path": "src/modules/admin/contentRecovery.ts",
      "sha256": "7f910f2dc4714904d275cf683421dc41db2d63b6af01d5af18d46c9a9c938ee9"
    },
    {
      "path": "src/modules/admin/FaqAdminPage.tsx",
      "sha256": "cb6800895dd068e727031edc576c47119511db4272239ce43f073c8b7f015049"
    },
    {
      "path": "src/modules/admin/index.ts",
      "sha256": "b1009f7886f179622580e0a7be69d8a87e8cd9ff9f3be6809a86d5620949486e"
    },
    {
      "path": "src/modules/admin/roomPublication.contract.ts",
      "sha256": "7cea17638ca71fd0cb3ae7efa787c78d1a6dd11c416460d1432dee08fa10e381"
    },
    {
      "path": "src/modules/admin/specs.ts",
      "sha256": "a6d372d8e92db4848320350ab2e662dea913ba83d1c6dd3620550044c2fadb60"
    },
    {
      "path": "src/modules/admin/strings.ts",
      "sha256": "1d5633f21342af133dd4554396be4038d55e77e02ff4d10b25954218977f7e8f"
    },
    {
      "path": "src/modules/admin/useContentRecovery.tsx",
      "sha256": "4fd3851eee013be26efaf885f556b9856066767cc3ec9562aa5334ff9dd542bc"
    },
    {
      "path": "src/modules/classSchedule/index.ts",
      "sha256": "9c7e999dab0226dd9f730b227aee6c84fa114ffa07d4c21401519c11b6e160ee"
    },
    {
      "path": "src/modules/classSchedule/pages.tsx",
      "sha256": "36cfc0e4d0c2cad05d9d458acacd5c8162014c7b3fe7824467b3e2520cee4e05"
    },
    {
      "path": "src/modules/classSchedule/specs.ts",
      "sha256": "674bb22278d1b84e320f4c4db5fc7489435a49449087059891c5ae87a50baa6c"
    },
    {
      "path": "src/modules/classSchedule/strings.ts",
      "sha256": "3766093e474925d49967ebdab3c2441550f2a76bf7006158052b99f1287cabae"
    },
    {
      "path": "src/modules/customer/hooks.ts",
      "sha256": "9132b19e3f1eed143f70ebcb0e7e7bfbfdf61f12a4077118df36e7592ba853ec"
    },
    {
      "path": "src/modules/customer/index.ts",
      "sha256": "9defed5fa35881cac8a9878e57be5fcf9757db9a8bdd8183799fb51eb327e172"
    },
    {
      "path": "src/modules/customer/pages/ClassDetailPage.tsx",
      "sha256": "d02e92205a15d137591ecaaca1c3612c8b4ec603ce4d4b39dcd86a77ed0b2ce5"
    },
    {
      "path": "src/modules/customer/pages/FaqPage.tsx",
      "sha256": "16d610582326d817ff571576de04f53c007f804760c23f571ca93854bd79be8e"
    },
    {
      "path": "src/modules/customer/pages/SchedulePage.tsx",
      "sha256": "a68eb03fca41f5edfb6ae3c161ada3889556040693c386857302e86e1861a8bd"
    },
    {
      "path": "src/modules/customer/pages/TeachersPage.tsx",
      "sha256": "fc4931849da43711042937198abb30246467154ef7a01244e065ec07e896cf8a"
    },
    {
      "path": "src/modules/customer/scopedSessionRows.ts",
      "sha256": "9b334ba83d8437181db4229222677eb45c40b4d31a61fd1a705fdd918d30a95c"
    },
    {
      "path": "src/modules/customer/specs.ts",
      "sha256": "994aa3b78cbaa76bbeca6c7c3da6ed001f6569f0adb64acbfdd3c7f9dc499705"
    },
    {
      "path": "src/modules/customer/strings.ts",
      "sha256": "e26783fbcc9be2e81562dbe25daa5c93cdee7e975b2d3e2b826f149cbea8decc"
    },
    {
      "path": "src/modules/customer/useCustomerRows.ts",
      "sha256": "d4496e0f02c447bd6a17fb15d3cda469bfba8910b0ece82ac4870a3cce0add64"
    },
    {
      "path": "src/modules/customer/useScopedCustomerRead.ts",
      "sha256": "032247e233fb8cb5f2730c67abd47c3a31735d0a98cb301b470a5e226e5fd018"
    },
    {
      "path": "src/modules/staff/CheckinPage.tsx",
      "sha256": "0864ac545c7d2a95b80b5384f2bd7946e9f5619baba54c6cf2ceb9772e237742"
    },
    {
      "path": "src/modules/staff/index.ts",
      "sha256": "151a57f3abe1d5262fd9cf742e812217f377194fa4058ce698633bb8d64ec051"
    },
    {
      "path": "src/modules/staff/people.ts",
      "sha256": "c497946aba7fdc844bc5364aed89c7fb99f85d1dd82605831d20a1d07067cef5"
    },
    {
      "path": "src/modules/staff/RegisterPage.tsx",
      "sha256": "006428987d41fde2f0a832a533921694c46f0aae818a434e532f2b620511909d"
    },
    {
      "path": "src/modules/staff/RoomsPage.tsx",
      "sha256": "99e0cef9c2bf2548772cb8d6a5428dd0e5684b26a10f62b563d0791182a32c1f"
    },
    {
      "path": "src/modules/staff/specs.ts",
      "sha256": "c2e74cd0d99a808bfc8174b9b4693d72b85d6218d3304ae911ad522f2281b3b4"
    },
    {
      "path": "src/modules/staff/strings.ts",
      "sha256": "27f26841ff38bc66f33d0d11a80944e6c8c869b8b1d185321bc4dacfaa1adcdd"
    },
    {
      "path": "src/modules/website/hooks.ts",
      "sha256": "bd5cc409f3fffcc46b5a346bdc8ff58453af10c6b046104a483869eb86e51852"
    },
    {
      "path": "src/modules/website/index.ts",
      "sha256": "442860144f917ef81659b74a08311a92971b602901bdc9157bdbe9b1880feb32"
    },
    {
      "path": "src/modules/website/pages/FaqPage.tsx",
      "sha256": "1f1456fed825fe07b0ff578d1c4bb4090a3e34008255937f310a4065d2e0c879"
    },
    {
      "path": "src/modules/website/pages/SchedulePage.tsx",
      "sha256": "88624a0106d665fa1fe0aa0552d124ec970b39d320f50be4a3d4c4e453f13444"
    },
    {
      "path": "src/modules/website/pages/TeachersPage.tsx",
      "sha256": "3e40f718d7c874db820e45a6a2dd592f91142e544c456dc6de09441d3744aad3"
    },
    {
      "path": "src/modules/website/specs.ts",
      "sha256": "434a2d0fb0c030630fb2cdc31835f71ad054bdf189da60aa1d29c342de9d80e4"
    },
    {
      "path": "src/modules/website/strings.ts",
      "sha256": "b86cffb430fe1867677f6b0fabdfef93131e155f186d8dfb50609fa6076e3a91"
    },
    {
      "path": "src/specs/canvasSpecs.ts",
      "sha256": "8d73e52d2314cc003007df339ee7ac08cf41a3ec083bf7110843bef39a3cbc58"
    },
    {
      "path": "src/tenant/tenant.ts",
      "sha256": "b6bc47f8a9eb805ac5e19cdf9f6392ee05c4911e5c2423ad149f4645e2aaf14e"
    }
  ],
  "adapterTests": [
    {
      "path": "scripts/test-content-recovery.mjs",
      "sha256": "63890036b89211fcce768cc4942dab136c96a1836fa98b70a233a3964366f166",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Actual MockProvider atomic writes, draft creation, rollback, exact retry, FAQ ordering, role and tenant rejection. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-content-recovery-context.mjs",
      "sha256": "fe986e2f0077f9ed0b0abaff6ce690c2e0b2b5badf0650163543253c589d0441",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Content command actor and role context fencing. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-content-recovery-ui.mjs",
      "sha256": "8078023483e7b88bc700c904194a397dd3003f7777eac84c089a5a5afa466820",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Actual editor retained drafts, errors, retry and FAQ ordering. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-content-recovery-context-ui.mjs",
      "sha256": "1e3456f2033058d18d21d22052edac333989eecf21a75a591d8145b8b5d1c0aa",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Actual editor context recovery. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-class-management.mjs",
      "sha256": "b4644b57a7b6aa0c8f3761d835f2d2cccb5e55e5ddb70f9cdd5642bf6ad3d421",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Recurrence preview and generation boundaries. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-class-management-provider.mjs",
      "sha256": "cc63e0a9cbce9baf577119cdef31b35cb7e2cf35c2e7b5c5dc9038b962924255",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Actual MockProvider occurrence generation and preservation. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-class-management-ui.mjs",
      "sha256": "d64589b879b0de88c23bf4c7c7bccefed40f28bb5d6356b94f46e824fafdcf36",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Actual class-management forms and generated occurrences. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-session-admission.mjs",
      "sha256": "eb6efeb1e67607b407e576da1dea97fd350891f2b00c092fa1412871cfcdc264",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Actual MockProvider withdrawal, republish and historical booking preservation. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-ad01-native-cycle.mjs",
      "sha256": "32db1c2e9a780c63a5c74248005c2e6d07905064ad54184aa85e3553fe22f2be",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Native UI create/edit and supported publication across existing consumers, eligible existing fictional actor selection, preserved history, four default EN/ES390/1280 groups and rejection of invalid or empty selections. Reference inventory; test execution evidence is separate."
    },
    {
      "path": "scripts/test-room-publication.mjs",
      "sha256": "c22eb6ffe255426dff796633a7b2c604d2dd42100781b7bb3142d734d8f3ae53",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Prospective room publication, current mock adapter guards, retained references, rollback and native selection/retry/context. Inventory binding only; execution receipts remain separate."
    },
    {
      "path": "scripts/test-room-publication-ui.mjs",
      "sha256": "0973459d942629aa0f97236de6a0a59bbf4dfc20255e71fd6669969fabf38146",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Prospective room publication, current mock adapter guards, retained references, rollback and native selection/retry/context. Inventory binding only; execution receipts remain separate."
    },
    {
      "path": "scripts/test-room-publication-production.mjs",
      "sha256": "67fe206377fd6f12a54a1f306f9e41620974b325e9dc1d280067f1040e468b0c",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Prospective room publication, current mock adapter guards, retained references, rollback and native selection/retry/context. Inventory binding only; execution receipts remain separate."
    },
    {
      "path": "scripts/test-room-publication-contract.mjs",
      "sha256": "9b6ec2b1a044fa6a1056897f0fc56ee422e4f8bf1d00005609e3c156b4f56ad4",
      "reviewedSourceDigest": "e7920c10c7d3a9818fb53b04c6f3f115dad1a3731a0c7c2c359aeabd147dd961",
      "verifies": "Prospective room publication, current mock adapter guards, retained references, rollback and native selection/retry/context. Inventory binding only; execution receipts remain separate."
    }
  ],
  "entities": [
    {
      "name": "class_templates",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "start_date",
        "end_date",
        "generation_mode",
        "theme",
        "description",
        "title",
        "modality_id",
        "teacher_id",
        "room_id",
        "weekday",
        "start_time",
        "duration_min",
        "capacity",
        "level",
        "active"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "teachers",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "display_name",
        "bio",
        "photo_url",
        "specialties",
        "certifications",
        "rate_per_class",
        "active",
        "rating_avg"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "modalities",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "slug",
        "name_es",
        "name_en",
        "tone",
        "description",
        "intensity",
        "heated",
        "duration_min",
        "active"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "rooms",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "name",
        "capacity",
        "heated",
        "notes",
        "active"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "audit_log",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "actor_id",
        "action",
        "entity",
        "entity_id",
        "diff",
        "ip"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "faq_entries",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "group_key",
        "group_title",
        "group_lead",
        "page",
        "question",
        "answer",
        "sort",
        "published"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "class_sessions",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "theme_override",
        "description_override",
        "template_id",
        "title",
        "modality_id",
        "teacher_id",
        "room_id",
        "starts_at",
        "ends_at",
        "capacity",
        "booked_count",
        "level",
        "status",
        "cancel_reason"
      ],
      "usage": [
        "read",
        "command-effect"
      ]
    },
    {
      "name": "bookings",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "session_id",
        "status"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "waitlist",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "session_id",
        "status"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "users",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "email",
        "status"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "profiles",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "full_name"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "memberships",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "status"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "plans",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "tenants",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "settings"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "class_ledger",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at",
        "user_id",
        "delta",
        "reason"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "user_roles",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "consents",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "payments",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "invoices",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "message_log",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "space_bookings",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at"
      ],
      "usage": [
        "dependency"
      ]
    },
    {
      "name": "special_charges",
      "fields": [
        "id",
        "tenant_id",
        "created_at",
        "updated_at"
      ],
      "usage": [
        "dependency"
      ]
    }
  ],
  "mockExtensions": [
    {
      "entity": "rooms",
      "field": "active",
      "type": "bool",
      "source": "src/data/roomPublication.ts",
      "reason": "Optional browser-only prospective room publication; legacy missing state remains published. Backend mapping pending; no SQL or live connection change."
    }
  ],
  "pages": [
    {
      "code": "M-02",
      "route": "/admin/content",
      "routeSource": "src/modules/admin/index.ts",
      "specSource": "src/modules/admin/specs.ts",
      "specAnchor": "export const M02 =",
      "routeSpec": "M02",
      "componentSource": "src/modules/admin/ContentPage.tsx",
      "componentExport": "ContentPage",
      "viewKind": "data-table",
      "specEntities": [
        "class_templates",
        "teachers",
        "modalities",
        "rooms",
        "audit_log"
      ],
      "views": [],
      "states": [
        "Synthetic draft catalog with unpublished room",
        "Synthetic published catalog; room unchanged",
        "Synthetic withdrawn catalog; room retained",
        "Synthetic draft room",
        "Synthetic published room",
        "Synthetic legacy room without publication flag",
        "Synthetic retained unpublished room reference"
      ],
      "fixtureIds": [
        "ad01-m-02-0",
        "ad01-m-02-1",
        "ad01-m-02-2",
        "ad01-room-m-02-0",
        "ad01-room-m-02-1",
        "ad01-room-m-02-2",
        "ad01-room-m-02-3"
      ]
    },
    {
      "code": "M-02b",
      "route": "/admin/content/faq",
      "routeSource": "src/modules/admin/index.ts",
      "specSource": "src/modules/admin/specs.ts",
      "specAnchor": "export const M02b =",
      "routeSpec": "M02b",
      "componentSource": "src/modules/admin/FaqAdminPage.tsx",
      "componentExport": "FaqAdminPage",
      "viewKind": "review-list",
      "specEntities": [
        "faq_entries",
        "audit_log"
      ],
      "views": [],
      "states": [
        "Synthetic unpublished FAQ draft",
        "Synthetic published FAQ",
        "Synthetic unpublished FAQ after withdrawal"
      ],
      "fixtureIds": [
        "ad01-m-02b-0",
        "ad01-m-02b-1",
        "ad01-m-02b-2"
      ]
    },
    {
      "code": "M-14",
      "route": "/admin/class-schedule",
      "routeSource": "src/modules/classSchedule/index.ts",
      "specSource": "src/modules/classSchedule/specs.ts",
      "specAnchor": "export const scheduleSpec:",
      "routeSpec": "scheduleSpec",
      "componentSource": "src/modules/classSchedule/pages.tsx",
      "componentExport": "ClassSchedulePage",
      "viewKind": "data-table",
      "specEntities": [
        "class_sessions",
        "class_templates",
        "teachers",
        "modalities",
        "rooms",
        "audit_log"
      ],
      "views": [],
      "states": [
        "Synthetic generated dated occurrence",
        "Synthetic edited dated occurrence",
        "Synthetic draft room",
        "Synthetic published room",
        "Synthetic legacy room without publication flag",
        "Synthetic retained unpublished room reference"
      ],
      "fixtureIds": [
        "ad01-m-14-0",
        "ad01-m-14-1",
        "ad01-room-m-14-0",
        "ad01-room-m-14-1",
        "ad01-room-m-14-2",
        "ad01-room-m-14-3"
      ]
    },
    {
      "code": "W-04",
      "route": "/site/schedule",
      "routeSource": "src/modules/website/index.ts",
      "specSource": "src/modules/website/specs.ts",
      "specAnchor": "  schedule: defineSpec",
      "routeSpec": "siteSpecs.schedule",
      "componentSource": "src/modules/website/pages/SchedulePage.tsx",
      "componentExport": "SchedulePage",
      "viewKind": "cards",
      "specEntities": [
        "class_sessions",
        "modalities",
        "teachers",
        "rooms"
      ],
      "views": [],
      "states": [
        "Synthetic published shape",
        "Synthetic withdrawn shape"
      ],
      "fixtureIds": [
        "ad01-w-04-0",
        "ad01-w-04-1"
      ]
    },
    {
      "code": "W-05",
      "route": "/site/teachers",
      "routeSource": "src/modules/website/index.ts",
      "specSource": "src/modules/website/specs.ts",
      "specAnchor": "  teachers: defineSpec",
      "routeSpec": "siteSpecs.teachers",
      "componentSource": "src/modules/website/pages/TeachersPage.tsx",
      "componentExport": "TeachersPage",
      "viewKind": "cards",
      "specEntities": [
        "teachers",
        "modalities"
      ],
      "views": [],
      "states": [
        "Synthetic published shape",
        "Synthetic withdrawn shape"
      ],
      "fixtureIds": [
        "ad01-w-05-0",
        "ad01-w-05-1"
      ]
    },
    {
      "code": "W-10",
      "route": "/site/faq",
      "routeSource": "src/modules/website/index.ts",
      "specSource": "src/modules/website/specs.ts",
      "specAnchor": "  faq: defineSpec",
      "routeSpec": "siteSpecs.faq",
      "componentSource": "src/modules/website/pages/FaqPage.tsx",
      "componentExport": "FaqPage",
      "viewKind": "review-list",
      "specEntities": [
        "faq_entries"
      ],
      "views": [],
      "states": [
        "Synthetic published shape",
        "Synthetic withdrawn shape"
      ],
      "fixtureIds": [
        "ad01-w-10-0",
        "ad01-w-10-1"
      ]
    },
    {
      "code": "C-02",
      "route": "/app/schedule",
      "routeSource": "src/modules/customer/index.ts",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "  'C-02': ext(",
      "routeSpec": "canvasSpecs['C-02']",
      "componentSource": "src/modules/customer/pages/SchedulePage.tsx",
      "componentExport": "SchedulePage",
      "viewKind": "cards",
      "specEntities": [
        "class_sessions",
        "modalities",
        "teachers",
        "rooms",
        "bookings",
        "waitlist"
      ],
      "views": [],
      "states": [
        "Synthetic published shape",
        "Synthetic withdrawn shape"
      ],
      "fixtureIds": [
        "ad01-c-02-0",
        "ad01-c-02-1"
      ]
    },
    {
      "code": "C-03",
      "route": "/app/class/:id",
      "routeSource": "src/modules/customer/index.ts",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "  'C-03': ext(",
      "routeSpec": "canvasSpecs['C-03']",
      "componentSource": "src/modules/customer/pages/ClassDetailPage.tsx",
      "componentExport": "ClassDetailPage",
      "viewKind": "cards",
      "specEntities": [
        "class_sessions",
        "modalities",
        "teachers",
        "rooms",
        "bookings",
        "waitlist"
      ],
      "views": [],
      "states": [
        "Synthetic published shape",
        "Synthetic withdrawn shape"
      ],
      "fixtureIds": [
        "ad01-c-03-0",
        "ad01-c-03-1"
      ]
    },
    {
      "code": "C-14",
      "route": "/app/faq",
      "routeSource": "src/modules/customer/index.ts",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "  'C-14': ext(",
      "routeSpec": "canvasSpecs['C-14']",
      "componentSource": "src/modules/customer/pages/FaqPage.tsx",
      "componentExport": "FaqPage",
      "viewKind": "review-list",
      "specEntities": [
        "faq_entries"
      ],
      "views": [],
      "states": [
        "Synthetic published shape",
        "Synthetic withdrawn shape"
      ],
      "fixtureIds": [
        "ad01-c-14-0",
        "ad01-c-14-1"
      ]
    },
    {
      "code": "C-18",
      "route": "/app/teachers",
      "routeSource": "src/modules/customer/index.ts",
      "specSource": "src/modules/customer/specs.ts",
      "specAnchor": "  'C-18': ext(",
      "routeSpec": "canvasSpecs['C-18']",
      "componentSource": "src/modules/customer/pages/TeachersPage.tsx",
      "componentExport": "TeachersPage",
      "viewKind": "cards",
      "specEntities": [
        "teachers",
        "modalities",
        "class_sessions"
      ],
      "views": [],
      "states": [
        "Synthetic published shape",
        "Synthetic withdrawn shape"
      ],
      "fixtureIds": [
        "ad01-c-18-0",
        "ad01-c-18-1"
      ]
    },
    {
      "code": "S-02",
      "route": "/staff/checkin",
      "routeSource": "src/modules/staff/index.ts",
      "specSource": "src/modules/staff/specs.ts",
      "specAnchor": "export const S02 =",
      "routeSpec": "S02",
      "componentSource": "src/modules/staff/CheckinPage.tsx",
      "componentExport": "CheckinPage",
      "viewKind": "review-list",
      "specEntities": [
        "class_sessions",
        "bookings",
        "waitlist",
        "users",
        "profiles",
        "memberships",
        "plans",
        "teachers",
        "modalities",
        "audit_log",
        "tenants"
      ],
      "views": [],
      "states": [
        "Synthetic published shape",
        "Synthetic withdrawn shape"
      ],
      "fixtureIds": [
        "ad01-s-02-0",
        "ad01-s-02-1"
      ]
    },
    {
      "code": "S-04",
      "route": "/staff/register",
      "routeSource": "src/modules/staff/index.ts",
      "specSource": "src/modules/staff/specs.ts",
      "specAnchor": "export const S04 =",
      "routeSpec": "S04",
      "componentSource": "src/modules/staff/RegisterPage.tsx",
      "componentExport": "RegisterPage",
      "viewKind": "form-preview",
      "specEntities": [
        "users",
        "profiles",
        "user_roles",
        "consents",
        "payments",
        "invoices",
        "memberships",
        "class_ledger",
        "bookings",
        "class_sessions",
        "message_log",
        "audit_log",
        "tenants",
        "rooms"
      ],
      "views": [],
      "states": [
        "Synthetic draft room",
        "Synthetic published room",
        "Synthetic legacy room without publication flag",
        "Synthetic retained unpublished room reference"
      ],
      "fixtureIds": [
        "ad01-room-s-04-0",
        "ad01-room-s-04-1",
        "ad01-room-s-04-2",
        "ad01-room-s-04-3"
      ]
    },
    {
      "code": "S-05",
      "route": "/staff/rooms",
      "routeSource": "src/modules/staff/index.ts",
      "specSource": "src/modules/staff/specs.ts",
      "specAnchor": "export const S05 =",
      "routeSpec": "S05",
      "componentSource": "src/modules/staff/RoomsPage.tsx",
      "componentExport": "RoomsPage",
      "viewKind": "form-preview",
      "specEntities": [
        "rooms",
        "class_sessions",
        "space_bookings",
        "special_charges",
        "teachers",
        "modalities",
        "users",
        "profiles",
        "audit_log"
      ],
      "views": [],
      "states": [
        "Synthetic draft room",
        "Synthetic published room",
        "Synthetic legacy room without publication flag",
        "Synthetic retained unpublished room reference"
      ],
      "fixtureIds": [
        "ad01-room-s-05-0",
        "ad01-room-s-05-1",
        "ad01-room-s-05-2",
        "ad01-room-s-05-3"
      ]
    }
  ]
}
/* cms-data:end */
) satisfies CmsFeatureContract;
export default feature;
