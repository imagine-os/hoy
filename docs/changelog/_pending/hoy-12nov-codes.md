# Hoy 12 Nov, lane H-CODES: teacher codes, funnel report and the checkout code field

Prompt intent: decision D5: teachers hand out their own codes and the studio sees what they bring.
Decision: Administration gets a Teacher codes page (create codes per teacher, copy the share link) and a funnel report (codes shared, redeemed, first classes taken). The app checkout gets a "¿Tienes un código?" field; a redeemed code adds its classes to the person's balance. The field is neutral because it also redeems gift and courtesy codes. Needs Company OS >= 1.11.0 (voucher coach and first_time_only).
Alternative rejected: a separate code screen outside checkout.
Files: src/modules/vouchers/production/**, src/modules/customer/pages/ServerCheckoutPage.tsx, src/data/companyos/**, scripts/test-teacher-codes.mjs, company-os.json
Version: pending (merged with the Hoy 12 Nov release; Company OS >= 1.11.0 per `company-os.json`).
