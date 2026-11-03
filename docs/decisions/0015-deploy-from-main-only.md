# 0015. The web build deploys to GitHub Pages from main only

Date: 2026-10 (v0) · Status: accepted · Area: deploy

## Context
GitHub Pages at `https://miguelaguerrero.github.io/chronicles/`. The owner's choice of which branch the Pages environment accepts.

## Decision
`.github/workflows/pages.yml` publishes on pushes to `main`, the only branch the Pages environment accepts.

## Consequences
- The workflow runs the typecheck and tests, then exports with `CHRONICLES_BASE_URL=/chronicles`; `app.config.js` turns it into `experiments.baseUrl`; `index.html` is copied to `404.html` so a reload on `/chronicles/walk` works.
- Deploy to main only after a slice's fixes pass the full suite (0018).
