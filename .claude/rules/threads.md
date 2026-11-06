---
paths:
  - "src/lib/threads/**"
  - "src/lib/__tests__/threads/**"
---
# Owner threads

Threads the owner makes: a moment stays whole, and a thread, its members and a directed reply are separate stored records (specs/owner-threads, decision 0102). The criteria are OT1-OT24; their tests are written before their code.

- **Truth, not cache.** `thread`, `thread_member` and `moment_link` are never derived and never carry a tile build. The Chronicle's derived threads (`lib/resurface`, 0098) are a separate environment: neither reads the other.
- **No empty thread.** A thread exists only because two kept moments were connected (OT6); one left, and it dissolves (OT15).
