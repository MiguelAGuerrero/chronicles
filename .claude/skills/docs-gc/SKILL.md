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

## 2. Every file a doc names exists

```bash
shopt -s globstar
found() { for g in "$1" "src/**/$1" "scripts/$1" "public/$1" "assets/**/$1"; do compgen -G "$g" >/dev/null && return 0; done; return 1; }
grep -ohE '`[A-Za-z0-9_./()[-]+\.(ts|tsx|js|mjs|json|md|yml)`' AGENTS.md docs/ARCHITECTURE.md docs/TESTING.md .claude/rules/*.md \
  | tr -d '`' | sort -u | while read -r p; do found "$p" || echo "named but missing: $p"; done
```

A bare name (`geo.ts`) is looked up under `src/`, `scripts/`, `public/` and
`assets/`; a path is taken as written. Placeholders (`x.native.ts`) are
expected hits; rename any other reference or restore the file.

## 3. Every rule's `paths:` glob matches a file

```bash
shopt -s globstar nullglob
for r in .claude/rules/*.md; do
  sed -n '/^paths:/,/^[a-z]*:/p' "$r" | grep -oE '"[^"]+"|- +[^ ]+' | sed 's/^- *//; s/"//g' | while read -r g; do
    set -- $g; [ -e "$1" ] || echo "$r: no file matches $g"; done; done
```

## 4. AGENTS.md stays short

```bash
wc -l AGENTS.md    # under 200; move anything longer into a rule, a doc or a skill
```

## 5. PRODUCT.md mentions every shipped slice

```bash
sed -n '/^## Shipped/,/^## /p' docs/STATUS.md | grep -oE '^\| *[^|]+' | sed 's/^| *//' | while read -r s; do
  grep -qiF "$s" docs/PRODUCT.md || echo "shipped but not in PRODUCT.md: $s"; done
```

Adjust the sed range to STATUS.md's actual heading and column if they differ.

## 6. Specs match the concept doc

```bash
grep -H "Last exported" specs/*/spec.md
```

Read the doc https://claude.ai/artifact/6P9aUdZJAdReBi6yFVtwa7 with the
Claude Docs tools (never WebFetch) and compare each tab's last change with
its spec's date. Re-export a changed tab into its `specs/<slug>/spec.md` and
set "Last exported" to today; the doc wins over the spec.

## 7. Deferred items that have since shipped

```bash
grep -oE '`[A-Za-z_][A-Za-z0-9_]*`' docs/DEFERRED.md | tr -d '`' | sort -u | while read -r c; do
  n=$(git log --oneline -S"$c" -- src | wc -l); [ "$n" -gt 0 ] && grep -rqw "$c" src && echo "deferred but in code ($n commits): $c"; done
```

Read each hit: a constant named in both is not proof. Move a shipped item to
the spec's record and PRODUCT.md, and drop it from DEFERRED.md.

## 8. Native is still unverified

```bash
grep -n "never run on a device\|not run on a device" docs/NATIVE_UNVERIFIED.md AGENTS.md
```

Both must say so unless the owner reports a device run; then update both and
`docs/STATUS.md`.

## 9. README commands match package.json

```bash
diff <(grep -oE 'npm (run [a-z0-9:-]+|test)' README.md | sed 's/npm run //; s/npm //' | sort -u) \
     <(node -e "console.log(Object.keys(require('./package.json').scripts).join('\n'))" | grep -v postinstall | sort)
```

Lines only on the left are README commands that don't exist; only on the
right are scripts the README doesn't show (fine for `start`, `android`, `ios`
if the README says so elsewhere).

## 10. The slice's criteria have tests

```bash
npm run -s check:specs
```

Any id of the slice just built that it lists is missing its unit test or e2e
step. Retired ids and unbuilt rounds are expected in the list.

## 11. Output

A short table, one row per check:

| check | drift found | fixed |
|---|---|---|
| 1 routes and lib dirs | `day/[key].tsx` missing | added to codemap |

End with the files changed. Nothing found: say "no drift" for that row.
