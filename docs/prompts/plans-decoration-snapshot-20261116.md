# Plans decoration verifier

## Prompt
Fix narrowly repeated production website verifier failure at scripts/test-website-live.mjs line57 Plans decoration.mask. Need fresh-document atomic sampling of .site-pagehead and getComputedStyle ::after, assert connected plus the same radial-gradient mask, pointer none and unchanged overflow check, and record raw diagnostics in failure.json. Do not weaken assertions, retry until pass, redeploy, or touch real data.

## Response
Added a self-contained fresh-DOM sampler, strict fixture tests, variant-specific failure evidence and coverage in the existing release-verifier workflow. No product or customer-data behavior changed. Hosted verification and independent review remain required.
