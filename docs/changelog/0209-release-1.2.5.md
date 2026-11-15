---
date: 2026-11-14
version: 1.2.5
prompt: docs/prompts/0209-release-1.2.5.md
intent: Release Justin-approved Aleja website adjustments after merging PR147.
decision: Bump only the package and lock version strings; use Cut release then Deploy web (prod).
rejected: Direct production deployment from a branch, reusing a prior release tag, or including held feature branches.
files: package.json, package-lock.json, changelog0208, this release record, prompt log, kanban
---

Release metadata for merged b6627a3 / checked source57d801c. Runtime, asset, dependency and Company OS requirement files are unchanged by this release preparation. Parent product tree passed176 public cases, retained image/frame/Home tests, production/review builds, full fake-Clerk regression CI and two independent reviews. Company OS >=1.11.0 remains required. Cut release and production deployment still must complete; merge alone is not a production deployment. Rollback: rerun Deploy web (prod) with v1.2.4.
