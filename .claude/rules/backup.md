---
paths:
  - "src/lib/backup/**"
  - "src/app/your-data.tsx"
  - "src/lib/__tests__/backup/**"
---
# Backup

Your data: the whole-app backup zip (decision 0241; specs/back-up-everything, BK1-BK12). The codemap is in
`docs/ARCHITECTURE.md`; the brief is `docs/research/app-backup.md`.

- **Truth only.** Every store and meta key is classified as backed up or cache in `backup/core.ts`; a new table, object
  store or meta key fails `npm test` until it is classified there (BK3).
