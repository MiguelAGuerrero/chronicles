# 0011. "Unwalked streets near me" counts named streets only

Date: 2026-10 (v0) · Status: accepted · Area: streets, fog

## Context
Round 3 (the owner's calls).

## Decision
Unwalked streets near me count named streets only, within 1 km by real distance. Pieces along this walk's trace (20 m) are left out of the fog until stop credits them.

## Consequences
- "Streets walked" and "new streets" count named streets only (`isNamedStreet`, shared by `finish.ts` and the delete recount).
- Street reads from the live view (`collectView`) only count at z14, tagged with the build from `ensureTileBuild()`, once per 100 m actually moved.
- The fog is bold only while the switch is on (0028).
