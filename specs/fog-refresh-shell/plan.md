# Fog refresh, the first shell: plan

For the owner's review before any code. Spec: `specs/fog-refresh-shell/spec.md` (FR1-FR10). Branch: `claude/fog-refresh-shell`, from `main` `1f88f56`.

## The shape

```
walk.tsx (view)                          lib/fog/shell.ts (shell)                    lib/fog/rules.ts (core)
  const [fog] = useState(newFog)           createFog(p: Pick<Ports, 'db'>)             FOG_RULES { nearM 1000, stepM 100, onTraceM 20 }
  on each fix: fog.refresh({ here,           store: { fog, walked }                     fogDue({ here, lastAt, busy, riding, build })
    riding, build, runs,                     refresh(): fogDue? → collect() →           fogOf({ pieces, visited, runs, here })
    collect: () => map.collectView() })       putSegments/putPlaces → getSegmentsIn →     → { fog, walked }
  useStore(fog.store, s => s.fog)             visitedSegmentIds (once) → fogOf → store
  on unmount: fog.close()                   close(): later results are dropped
  lib/fog/index.ts: newFog = () => createFog(ports)  (the app's constructor; apart, so tests never load the real db)
```

One instance per walk screen (credited ids are read once per screen, and the last read's place is the screen's), so the shell exports a constructor rather than one shared instance.

## Files

**New**
- `src/lib/fog/rules.ts` (core): `FOG_RULES`, `fogDue`, `fogOf`, `midpointOf` (moved from `walk.tsx`, unchanged).
- `src/lib/fog/shell.ts` (shell): `createFog`. Counts each read with `perfCount('fog:read')` for the journey.
- `src/lib/fog/index.ts` (shell): `newFog = () => createFog(ports)`, the app's constructor. Apart from `shell.ts` so a test of the shell never loads the real db.
- `src/lib/__tests__/fog.test.ts`: the tests below.

**Changed**
- `src/app/walk.tsx`: the effect (about 40 lines), its refs and `fog`/`walked` state go; three constants and `midpointOf` move to core; the screen calls the shell and reads its store.
- `src/components/map/WalkMap.web.tsx`: `data-fog` and `data-walked` (piece counts) on the map's container, for the journey, as `data-runs` already is.
- `scripts/layers.js`, `eslint.config.js`: the shell rule (FR8), its own rule id so its suppressions can't hide another boundary; `eslint-suppressions.json` records the 20 shells that import a singleton today (21 less the composition root); `functionalCoreAudit.test.ts` gets the new ceiling.
- `scripts/e2e-web.js` (the `fog` journey), `scripts/e2e-scenarios.js` (its row: `src/lib/fog/**`, `src/app/walk.tsx`, `src/lib/streets.ts`, the map).
- Docs: `.claude/rules/functional-core.md` (the shell rule, the constructor pattern), `docs/ARCHITECTURE.md` (the fog module), `docs/DEFERRED.md` (the shell rules item goes), `docs/NATIVE_UNVERIFIED.md`, `docs/STATUS.md`.

## Data

None.

## Tests per criterion

| Id | Test |
|---|---|
| FR1 | `FR1 a read is due on the first fix, then after 100 m; never riding, without a build, or during a read` (core) |
| FR2 | `FR2 within 1 km: credited pieces are walked, the rest fog, less pieces whose middle the trace passed within 20 m` (core) |
| FR3 | `FR3 a complete read stores streets before reading the fog, and places without waiting`; `FR3 an incomplete read stores nothing and reads again on the next fix`; `FR3 the unknown build stores nothing and still draws the cached fog` (shell, fake db and map) |
| FR4 | `FR4 credited ids are read once per fog instance` (shell; the call log) |
| FR5 | `FR5 a failed write still draws the fog; a failed read keeps the fog and waits for 100 m` (shell, `failNext`) |
| FR6 | `FR6 a read that ends after close changes nothing` (shell) |
| FR7 | `FR7 walk.tsx reads and writes nothing for the fog` (source check) |
| FR8 | `FR8 a shell importing the db, recorder or notifier is flagged; ports and types are not; the composition root is exempt` |
| FR9 | e2e `fog` journey: `FR9 ...` checks |
| FR10 | the `tabs`, `gaps` and `fog` journeys |

Shell tests assert the end state (the store, what the fake db holds) and use the call log only where order is the criterion (FR3: streets stored before the fog is read; FR4: one credited read).

## Deferred

- Moving the other effect clusters of `walk.tsx` (walk lifecycle, voice memo, navigation, dead-zone nudge): later slices, one each.
- The 20 shells recorded under FR8: each moves to `ports` when next touched.

## Native

`walk.tsx` on the phone runs the same shell through the real `ports` (SQLite) and the native map's `collectView`: unverified on a device, added to `docs/NATIVE_UNVERIFIED.md`.

## Done when

FR1-FR10's tests pass with typecheck, lint, `npm test`, and the `fog`, `tabs` and `gaps` journeys (decision 0074); no audit unless the owner asks; `/docs-gc` clean.
