# 0065 · Media library
version: 0.24.1
date: 2026-10-15

## Prompt intent
Unify site, class and teacher images in a searchable media library, with accurate placement links and publication states.

## Decision
Extend M-02d with a build-generated catalog of packaged media, grouped responsive variants, and a reactive projection over media_assets, teachers and modalities through the existing data provider. Each usage owns its state: live, draft preview, archived or inactive. Unassigned means no registered placement, not proof of no usage. The existing assignment editor remains separate and retains its behavior. Storage is explicitly a browser-only demo; no backend or upload integration is invented.

## Alternative rejected
One global published boolean, destructive asset replacement, and a disconnected duplicate catalog maintained by hand.

## Files touched
MediaLibrary component and metadata; mediaLibrary projection; generated catalog and generator; media strings; MediaPage, M-02d spec; build script; tests and screenshots.

## Verification
TypeScript, full build, deterministic catalog, per-usage regression checks, ES/EN desktop/mobile screenshots in both themes. Original imagery is not modified.
