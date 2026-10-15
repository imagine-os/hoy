# 0065 · Media library
version: 0.24.1
date: 2026-10-15

## Prompt intent
Unify site, class and teacher images in a searchable media library, with accurate placement links and publication states.

## Decision
Extend M-02d with a build-generated catalog of packaged media, grouped responsive variants, and a reactive projection over media_assets, teachers and modalities through the existing data provider. Each usage owns its state: live, draft preview, archived or inactive. Unassigned means no registered placement, not proof of no usage. Four owner-approved equipment photos preserve cool/warm originals as separate responsive variants. The opt-in About photo gallery dissolves between each pair over 40 seconds, with synchronized pause and reduced-motion handling. The existing assignment editor remains separate and retains its behavior. Storage is explicitly a browser-only demo; no backend or upload integration is invented.

## Alternative rejected
One global published boolean, destructive asset replacement, and a disconnected duplicate catalog maintained by hand.

## Files touched
MediaLibrary component and metadata; mediaLibrary projection; generated catalog and generator; media strings; MediaPage, M-02d spec; build script; tests and screenshots.

## Verification
Model and file-integrity checks pass locally. Deterministic catalog regeneration is verified. Hosted TypeScript/full-build and ES/EN desktop/mobile screenshot QA are pending; local Chromium is restricted and local full builds hit resource limits. Original imagery is not modified.
