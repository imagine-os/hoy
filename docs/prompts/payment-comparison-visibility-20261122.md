# S-09 payment comparison visibility

Date: 2026-11-23 UTC. This record contains only the implementation request, with private correspondence excluded.

## Request

In the existing payment review drawer, make the required manual bank comparison checkbox larger and more obvious. Show why Confirm payment is disabled until the checkbox is selected. Keep the guard and payment behavior unchanged.

## Response

Added a numbered comparison step, a larger native checkbox with a full-width touch label, and bilingual text by the confirmation buttons. Tested with the production component against a fictional H5 provider. Unchecked confirmation sent no request. Browser-based layout and keyboard checks remain pending because local Chromium could not start. See the [pending changelog](../changelog/_pending/payment-comparison-visibility-20261122.md).
