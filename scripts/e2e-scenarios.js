// The e2e's journeys and the source files each one covers (affected checks,
// AC9). `npm run check:affected` names the journeys that cover a changed
// file, to run with `E2E_ONLY=<name> npm run e2e:web` after `npm run
// export:web`. Each journey runs alone in a fresh browser, a fraction of the full flow.
//
// The owner's rule (decision 0074): a slice that changes a screen adds or
// extends a journey for its change, gives it a row here, and runs only the
// journeys check:affected names. The full flow (`npm run e2e:web` with no
// E2E_ONLY, about 15 minutes) runs only when the owner asks; it has no row.
// `affected.test.ts` fails while a journey the e2e runs alone has no row.
// Globs: `**` any depth, `*` within one folder, `{a,b}` either.

const SCENARIOS = [
  {
    name: 'tabs',
    covers: [
      'src/app/(tabs)/**',
      'src/app/_layout.tsx',
      'src/app/walk.tsx',
      'src/app/replay/**',
      'src/components/{RecordingBar,OpenWalk,HomeSheet,MomentBar,StartSettings}.tsx',
      'src/lib/{walkNav,walkGate,memoGate,recordingBar,startPlan,useStartWalk,launchRoute}.ts',
    ],
  },
  {
    // Navigate, ready (NR1-NR13) and its audit (navigate-ready audit 1-12).
    name: 'ready',
    covers: [
      'src/app/walk.tsx',
      'src/app/(tabs)/{_layout,navigate}.tsx',
      'src/components/walk/**',
      'src/components/{MomentBar,StartSettings,LocateButton,CompassButton}.tsx',
      'src/lib/{readyNav,walkNav,walkGate,useStartWalk}.ts',
      'src/lib/discovery/recallCheck.ts',
    ],
  },
  {
    // Media editing (ME1-ME23): the Edit offer, the editor's tools, the viewer, Download.
    name: 'edit',
    covers: [
      'src/components/edit/**',
      'src/components/{Baker,Baker.native,Baker.web,Baker.types,Caption,CaptureView,MomentBar,RecordingBar}.{ts,tsx}',
      'src/lib/{mediaEdit,editSession,editOffer,captureBus,useCaptures,thumbPlan,thumbJob}.ts',
      'src/lib/{captureEdits,videoEdit,media,export}/**',
      'src/app/walk.tsx',
    ],
  },
  {
    name: 'outlines',
    covers: ['src/lib/areas/**', 'src/lib/atlas/**', 'src/lib/finish.ts', 'scripts/mvt-encode.mjs'],
  },
  {
    name: 'marks',
    covers: ['src/lib/explore/**', 'src/lib/discovery/**', 'src/lib/atlas/**', 'src/components/MarkPinView.tsx', 'src/components/atlas/**', 'src/app/walk.tsx'],
  },
  {
    name: 'reload',
    covers: ['src/app/_layout.tsx', 'src/app/walk.tsx', 'src/components/{OpenWalk,RecordingBar}.tsx', 'src/lib/{session,openWalkLoad,walkEvents}.ts'],
  },
  {
    name: 'gaps',
    covers: ['src/lib/gaps/**', 'src/components/GapCard.tsx', 'src/app/replay/**', 'src/app/walk.tsx'],
  },
  {
    name: 'hidden',
    covers: ['src/lib/{hiddenLog,useLiveTrace}.ts', 'src/components/OpenWalk.tsx', 'src/app/walk.tsx'],
  },
  {
    // The pocket alert nudge (PA2, PA3, PA5, PA6): a double-tap as a "?" comes into range.
    name: 'nudge',
    covers: [
      'src/lib/{haptics,motion,motionTokens,canBuzz,canBuzz.web}.ts',
      'src/lib/explore/{explore,useExplore,settings}.ts',
      'src/components/{StartSettings,ExploreSettings}.tsx',
    ],
  },
  {
    name: 'qol',
    covers: [
      'src/components/{LocateButton,CompassButton,HomeSheet,CaptureView,CapturePinView}.tsx',
      'src/components/map/**',
      'src/app/(tabs)/chronicle.tsx',
      'src/lib/{scaleBar,units,unitsStore,useUnits,useLocate,rename,noteEdit,months,pins,thumbPlan,thumbJob,walkTitle,useReminded}.ts',
      'src/lib/nav/eta.ts',
    ],
  },
];

module.exports = { SCENARIOS };
