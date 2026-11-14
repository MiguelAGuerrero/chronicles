# 0177. A reaction opens its lens; the sign is always the face with a plus

Date: 2026-11-14 · Status: accepted · Area: chronicle, captures, vision · Amends: decision 0176 (lenses only in the contents), decision 0168 (the sign, once marked, is the type's own glyph), RX9 and RX12 of `specs/reactions`

## Context
The reactions slice's audit (`specs/reactions/spec.md`, Audit) found, in its cold find, that "gather all my ideas" was
placed only late, through Memories → Contents → Reactions, and called borderline not found (finding 22, high). Its UI
review found that the sign, once an entry had a reaction, became that reaction's glyph, so a plain smiling face read
both as "no reaction yet" and as "Happy" (U3).

## Decision
The owner's calls, Nov 14, at the audit's end:
- **A reaction under a moment opens its lens**: the mark under an entry's dateline, and in the viewer, is a way into
  the lens of that reaction, beside Contents → Reactions, which stays.
- **The sign is always the face with a plus**: it only ever means "add a reaction"; what is chosen is read under the
  dateline (RX14) and on the page's tool's panel.
- **Deploy first**: the reactions slice ships as built and audited; these two are a follow-up slice.

## Consequences
- A follow-up slice amends RX9 and RX12 (the sign and the Reaction tool show the face with a plus whatever is chosen)
  and adds a criterion for the marks as links (a moment shown in context, Back to where it was opened).
- 0176's "lenses live in the journal's contents" now has a second way in; 0168's "marked, the type's own glyph" ends.
