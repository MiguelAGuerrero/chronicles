---
paths:
  - "src/lib/journal/**"
  - "src/components/journal/**"
  - "src/lib/__tests__/journal/**"
---
# The journal (Chronicle's Memories)

Memories is a journal page (decision 0151): one sheet in book order, opening at today, ending in an open line where writing, a photo or a voice note is the capture. The spec is `specs/chronicle-journal/spec.md` (JN1-JN24). The codemap is in `docs/ARCHITECTURE.md`.

- **Two voices.** The owner's words are in the platform's serif; everything the app says is in its sans, muted. No sentence the app composed is ever set in the serif.
- **Typographic, never a costume.** No paper, binding, page turn or accent colour; no cards around entries.
- **The journal starts no walk and no trace.** An entry reads one fix when it begins (0036).
- **The past is fixed.** New entries land at the end; nothing inserts on a past page.
