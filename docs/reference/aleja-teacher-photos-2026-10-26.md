# Teacher photograph selection receipt

Reviewed the complete supplied teacher drawing and enlarged labels/arrows. No PDF pixels are used as website assets. The detailed private source receipt is retained outside the repository; private Drive links and source-file metadata are intentionally excluded from this published summary.

| Stable ID / placement | Visual selection from the annotated drawing | Action |
| --- | --- | --- |
| `tea_raghu` | Blue top, palms together | Replace white-top WebP variants |
| `tea_leandro` | Blue top, folded arms | Replace white-top WebP variants |
| `tea_clara` | Wood box portrait | Add named fallback and responsive assets |
| `tea_andre` | Hand on hip, selected by the dark-blue arrow linking the Andre Cardona list row and AC card | Add named fallback; preserve the separate Andrea profile |
| Home teacher-section group | Four-person composition with floor and slatted wall | Reuse matching packaged `hero-group`, replacing `pricing-duo` in this section |
| `tea_sara_e`, `tea_sara_c`, `tea_maria_camila`, `tea_tatiana` | Existing packaged portraits match the supplied drawing's composition, clothing and props | Unchanged |

These mappings follow the labelled annotation, rather than inference about identity from appearance or filename. Original assets were converted to responsive 480/960 WebP variants, auto-oriented, metadata stripped, quality 85, without enlargement. No generated imagery or enlarged PDF crops. Original source files are untouched.

## Preserved pending decisions

Carolina's directory assignment stays unchanged because the home-list and directory arrows conflict. Availability of a matching backbend source does not resolve that conflict. The separate `tea_andrea` and `tea_jennifer` profiles have no clear replacement arrows and remain unassigned. Stable IDs, seed records and CMS `photo_url` values are unchanged. Both public pages still use explicit `photo_url` before the opt-in Photos fallback. Latest, Classic and Archive have no new fallback assignments.

## Verification status

Full build and local teacher/media model checks pass. Browser QA is pending because the Wix task owns the shared BMM browser. Required follow-up: home and teacher directory, ES/EN at 390/768/1280, dark theme, image decoding/crops, and CMS override save/reload. No BMM browser was operated during this lane. Exact-head photography CI includes the matrix, placements and CMS override checks. No merge or deployment is authorized here.
