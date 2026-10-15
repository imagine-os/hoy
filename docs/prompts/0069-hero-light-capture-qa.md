# Hero capture theme evidence

## Original prompt

I think the regular web page should also have the same hero background as teh coming soon one, which looks beautiful.

## Follow-up context

[PR42 review finding](https://github.com/imagine-os/hoy/pull/42#discussion_r4288788068): the 344/768/3840 captures inherited the preceding dark case, despite filenames without a dark suffix. The saved 768 capture visibly confirms the mismatch. This is an evidence defect, not a customer-facing website defect.

## Response

Explicitly reset English/light storage, reload and assert the actual document language/theme before each extra-width capture. Assert filename language/theme across the full matrix too, record all 19 cases, and refresh the three extra-width images from genuine hosted Chromium QA.
