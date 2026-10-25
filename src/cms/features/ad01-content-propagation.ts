import type { CmsFeatureContract } from '../contracts';
// Bounded frontend propagation contract; see documented unsupported surfaces.
const feature = (
/* cms-data:start */
{
  "id": "ad01-content-propagation",
  "revision": 1,
  "backendMapping": "pending",
  "subscription": "local-events",
  "tenantField": "tenant_id",
  "identityField": "id",
  "actorScope": "AD-01 FeatureLog87/source88: bounded fictional local content inventory, not whole-criterion readiness. Existing route roles/content.write guards remain unchanged. Actual M-02 modes: DataTable/cards and entity Drawer; M-02b: section/review list and Drawer; M-14: calendar/list/DataTable and Drawer. views=[] because local view switches/search are not persisted TableViewConfig preferences. Consumers are calendars/cards/FAQ lists/roster; no forced TableTool adoption. Rooms have no publication field/control; reception has no FAQ consumer or room/theme display. Legacy specEntities are bound exactly, including legacy memberships/plans/tenants in S-02; class_templates/class_ledger consumer dependencies beyond legacy specs are declared separately. Local events only; backend mapping pending, no new policy/auth/timer/release guarantee.",
  "sources": [
    {
      "path": "src/components/organism/ClassCard/ClassCard.tsx",
      "sha256": "64bd8264828d3b3fbbe4e4727bee69f5d4214b01fb86f2bf2cf6d17e944fc550"
    },
    {
      "path": "src/components/organism/SessionCalendar/SessionCalendar.tsx",
      "sha256": "d674d79766e669e4669662281b736f0f518e5f744d6e5ba9dd3f4f9352d49e7c"
    },
    {
      "path": "src/data/DataContext.tsx",
      "sha256": "3a161e57f0c9548e111e8e99ec714a2ab153507ae7180db66ad95839ac324f15"
    },
    {
      "path": "src/data/MockProvider.ts",
      "sha256": "d4956fdff4c49724ec5e52ed731651d849698c10ed39b6982ef961ab4a975048"
    },
    {
      "path": "src/data/bookingContact.ts",
      "sha256": "1225c53d18134aa29e830bd79e76ba2765d6838e3e2b10736b4ed78bc689c8fb"
    },
    {
      "path": "src/data/classRecurrence.ts",
      "sha256": "f3e6cd2664013fbde2cccd22280bde74ab22691eefaf18918c78e538ad8c35b5"
    },
    {
      "path": "src/data/contentBatch.ts",
      "sha256": "545e26ed9c57fc8a57151bdafcd1f25730d7451e0d6aea0e536d04c280c9984f"
    },
    {
      "path": "src/data/dailyAdmission.ts",
      "sha256": "c77aa3e516ab1ef07b5f095fc7b1aea58f3dac83311cdd3a355dc160caed4823"
    },
    {
      "path": "src/data/schema.ts",
      "sha256": "c36b53dbb55139ba16ed284fe04d61504e55dfd2143c4f599fdd814bd5f16ed0"
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
      "path": "src/data/types.ts",
      "sha256": "e61845cd49fd4bf4625deeb46b6993c8023d2a077e416c0c6cca38b2cd80b5af"
    },
    {
      "path": "src/i18n/format.ts",
      "sha256": "3115d284da4bd9ff92b11e90d49eea3b859b15cbe8c84ebf40d88dc0c476f976"
    },
    {
      "path": "src/modules/admin/ContentPage.tsx",
      "sha256": "a1ec16026bc731dcfe772ac11223ee4e6f378d1916a69ec3b99bc63b0e5dcc86"
    },
    {
      "path": "src/modules/admin/FaqAdminPage.tsx",
      "sha256": "cb6800895dd068e727031edc576c47119511db4272239ce43f073c8b7f015049"
    },
    {
      "path": "src/modules/admin/contentNav.tsx",
      "sha256": "a432792177a313999dae2c021a1dd2e5e2c05d0557d3529f7e8381eb23d4a184"
    },
    {
      "path": "src/modules/admin/contentRecovery.ts",
      "sha256": "2f2822553f04961dec40e80bf0cdc146624563d02273021272a6dde3988f2189"
    },
    {
      "path": "src/modules/admin/index.ts",
      "sha256": "b1009f7886f179622580e0a7be69d8a87e8cd9ff9f3be6809a86d5620949486e"
    },
    {
      "path": "src/modules/admin/specs.ts",
      "sha256": "f13264e281830d9be3e2fe842ad7d3ddd53884a486e963fb60b7558b40f6b9ca"
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
      "sha256": "59380038d755f2b22a53f048e9ada07ddfdbe0b4d93e15492c8796bf434cccea"
    },
    {
      "path": "src/modules/classSchedule/specs.ts",
      "sha256": "2f48d5e307d22702a2ee23d91065f0ffe969c0ed2660506d276c536b1e258f76"
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
      "path": "src/modules/staff/specs.ts",
      "sha256": "ebccee5c0d1f6faef3625fccd7d21692afbb284f787cbc1761659e7e14b08449"
    },
    {
      "path": "src/modules/staff/strings.ts",
      "sha256": "6c5cd486071f2b14a95fde099a54c941d20f2484dc09405fe10f2012d268691f"
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
      "reviewedSourceDigest": "e8d7564942e422d0375f44119ea6a6d20d6cf776d40e55d246473b501cd75f5b",
      "verifies": "Actual MockProvider atomic writes, draft creation, rollback, exact retry, FAQ ordering, role and tenant rejection. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-content-recovery-context.mjs",
      "sha256": "fe986e2f0077f9ed0b0abaff6ce690c2e0b2b5badf0650163543253c589d0441",
      "reviewedSourceDigest": "e8d7564942e422d0375f44119ea6a6d20d6cf776d40e55d246473b501cd75f5b",
      "verifies": "Content command actor and role context fencing. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-content-recovery-ui.mjs",
      "sha256": "8078023483e7b88bc700c904194a397dd3003f7777eac84c089a5a5afa466820",
      "reviewedSourceDigest": "e8d7564942e422d0375f44119ea6a6d20d6cf776d40e55d246473b501cd75f5b",
      "verifies": "Actual editor retained drafts, errors, retry and FAQ ordering. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-content-recovery-context-ui.mjs",
      "sha256": "1e3456f2033058d18d21d22052edac333989eecf21a75a591d8145b8b5d1c0aa",
      "reviewedSourceDigest": "e8d7564942e422d0375f44119ea6a6d20d6cf776d40e55d246473b501cd75f5b",
      "verifies": "Actual editor context recovery. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-class-management.mjs",
      "sha256": "b4644b57a7b6aa0c8f3761d835f2d2cccb5e55e5ddb70f9cdd5642bf6ad3d421",
      "reviewedSourceDigest": "e8d7564942e422d0375f44119ea6a6d20d6cf776d40e55d246473b501cd75f5b",
      "verifies": "Recurrence preview and generation boundaries. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-class-management-provider.mjs",
      "sha256": "cc63e0a9cbce9baf577119cdef31b35cb7e2cf35c2e7b5c5dc9038b962924255",
      "reviewedSourceDigest": "e8d7564942e422d0375f44119ea6a6d20d6cf776d40e55d246473b501cd75f5b",
      "verifies": "Actual MockProvider occurrence generation and preservation. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-class-management-ui.mjs",
      "sha256": "d64589b879b0de88c23bf4c7c7bccefed40f28bb5d6356b94f46e824fafdcf36",
      "reviewedSourceDigest": "e8d7564942e422d0375f44119ea6a6d20d6cf776d40e55d246473b501cd75f5b",
      "verifies": "Actual class-management forms and generated occurrences. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-session-admission.mjs",
      "sha256": "eb6efeb1e67607b407e576da1dea97fd350891f2b00c092fa1412871cfcdc264",
      "reviewedSourceDigest": "e8d7564942e422d0375f44119ea6a6d20d6cf776d40e55d246473b501cd75f5b",
      "verifies": "Actual MockProvider withdrawal, republish and historical booking preservation. Reference inventory only; no test execution claim."
    },
    {
      "path": "scripts/test-ad01-native-cycle.mjs",
      "sha256": "a321a68be01460e3fc6a985bea47fd1d386c4b4975c4522598b681080d1c83dd",
      "reviewedSourceDigest": "e8d7564942e422d0375f44119ea6a6d20d6cf776d40e55d246473b501cd75f5b",
      "verifies": "Native UI create/edit and supported publication across existing consumers, eligible existing fictional actor selection, preserved history, four default EN/ES390/1280 groups and rejection of invalid or empty selections. Reference inventory; test execution evidence is separate."
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
        "notes"
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
    }
  ],
  "mockExtensions": [],
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
        "Synthetic draft catalog; room has no publication flag",
        "Synthetic published catalog; room unchanged",
        "Synthetic withdrawn catalog; room retained"
      ],
      "fixtureIds": [
        "ad01-m-02-0",
        "ad01-m-02-1",
        "ad01-m-02-2"
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
        "Synthetic edited dated occurrence"
      ],
      "fixtureIds": [
        "ad01-m-14-0",
        "ad01-m-14-1"
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
    }
  ]
}
/* cms-data:end */
) satisfies CmsFeatureContract;
export default feature;
