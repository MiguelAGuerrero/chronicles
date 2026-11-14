---
name: docs-gc
description: End-of-slice documentation garbage collection - concrete greps that find drift between the code and AGENTS.md, docs/ARCHITECTURE.md, docs/TESTING.md, docs/STATUS.md, docs/PRODUCT.md, docs/DEFERRED.md, docs/NATIVE_UNVERIFIED.md, specs/*/spec.md, .claude/rules and README.md, then fix it. Use at the end of every slice and before /deploy.
when_to_use: A slice is done; before a deploy; the owner asks whether the docs are current; a file was moved or renamed.
allowed-tools: Bash, Read, Edit, Grep, Glob, mcp__Claude_Docs__read, mcp__Claude_Docs__export
---

# docs-gc

Run every check from the repo root, fix what drifts, and report a table.
Fix the doc, not the code, unless the doc describes a rule the code broke.

## 1. Codemap covers every route and lib subdirectory

```bash
for f in $(cd src/app && find . -name '*.tsx' | sed 's#^\./##'); do
  grep -qF "$f" docs/ARCHITECTURE.md || echo "route not in codemap: $f"; done
for d in src/lib/*/; do n=$(basename "$d"); [ "$n" = __tests__ ] && continue
  grep -qE "lib/$n\b" docs/ARCHITECTURE.md || echo "lib dir not in codemap: $n"; done
```

## 2. Budgets, rule globs and named paths

```bash
npm run check:docs
```

`scripts/check-docs.js` checks AGENTS.md's budget (200 lines, 12 KB), rule
and skill sizes, that every rule's `paths:` glob matches a file, and that every
path the docs name exists (short names like `lib/quietLines` included). CI and
the Stop hook run it too; each failure says how to fix it. Fix the reference,
not the check.

## 2a. Rule files past the warning size (decision 0173)

```bash
npm run check:docs 2>&1 | grep 'warning:'
```

Each line names a rule file past 20,000 characters. In a session that is not
the loop, split it by topic (one file per slice or sub-topic, `paths:` narrowed
to its code, every line moved word for word, references to it updated).
In a loop run, which only adds to rule files (0135), file a `T [owner]` inbox
entry to split it instead (`/tend` section 5).

## 2b. The vision (decision 0094)

```bash
npm run check:vision -- --list
git log --oneline "$(grep -oE 'Last reviewed:.*at `[0-9a-f]+`' docs/VISION.md | grep -oE '[0-9a-f]{7,}')"..HEAD -- src/app src/components | wc -l
```

The first must be clean; read each excused line's reason. When the second says
five or more commits that changed a screen since the last review, run
`/vision review` (or say it is due in the report).

## 3. PRODUCT.md mentions every shipped slice

```bash
sed -n '/^## Shipped/,/^## /p' docs/STATUS.md | grep -oE '^\| *[^|]+' | sed 's/^| *//' | while read -r s; do
  grep -qiF "$s" docs/PRODUCT.md || echo "shipped but not in PRODUCT.md: $s"; done
```

Adjust the sed range to STATUS.md's actual heading and column if they differ.

## 4. Specs match the concept doc

```bash
grep -H "Last exported" specs/*/spec.md
```

Read the doc https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7 with the
Claude Docs tools (never WebFetch) and compare each tab's last change with
its spec's date. Re-export a changed tab into its `specs/<slug>/spec.md` and
set "Last exported" to today; the doc wins over the spec.

## 5. Deferred items that have since shipped

```bash
grep -oE '`[A-Za-z_][A-Za-z0-9_]*`' docs/DEFERRED.md | tr -d '`' | sort -u | while read -r c; do
  n=$(git log --oneline -S"$c" -- src | wc -l); [ "$n" -gt 0 ] && grep -rqw "$c" src && echo "deferred but in code ($n commits): $c"; done
```

Read each hit: a constant named in both is not proof. Move a shipped item to
the spec's record and PRODUCT.md, and drop it from DEFERRED.md with
`npm run records -- deferred item remove <match> --reason "<what shipped it>"`
(decision 0156: the three record documents change only through operations, two
removals per section per commit; `npm run check:records -- origin/main` before
the commit, whose message carries `npm run records -- trailers`).
Every agent commit is gated, a docs clean-up's too: CI replays each commit carrying your
`Claude-Session:` or `Co-Authored-By: Claude` trailer, so drift in these three is
fixed by an operation, never by hand.

## 6. Native is still unverified

```bash
grep -n "never run on a device\|not run on a device" docs/NATIVE_UNVERIFIED.md AGENTS.md
```

Both must say so unless the owner reports a device run; then update both and
`docs/STATUS.md` (the owner's own words, or `npm run records` operations).

## 7. README commands match package.json

```bash
diff <(grep -oE 'npm (run [a-z0-9:-]+|test)' README.md | sed 's/npm run //; s/npm //' | sort -u) \
     <(node -e "console.log(Object.keys(require('./package.json').scripts).join('\n'))" | grep -v postinstall | sort)
```

Lines only on the left are README commands that don't exist; only on the
right are scripts the README doesn't show (fine for `start`, `android`, `ios`
if the README says so elsewhere).

## 8. The slice's criteria have tests

```bash
npm run -s check:specs
```

Any id of the slice just built that it lists is missing its unit test or e2e
step. Retired ids and unbuilt rounds are expected in the list.

## 9. Output

A short table, one row per check:

| check | drift found | fixed |
|---|---|---|
| 1 routes and lib dirs | `day/[key].tsx` missing | added to codemap |

End with the files changed. Nothing found: say "no drift" for that row.
