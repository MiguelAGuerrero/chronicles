// The e2e's scenarios and the source files each one covers (affected checks, AC9).
// `node scripts/affected.js check` names the scenarios that cover a changed
// file, to run with `E2E_ONLY=<name> npm run e2e:web` (`main` is the default
// run, with no E2E_ONLY).
//
// The named scenarios run alone in a fresh browser (scripts/e2e-web.js). The
// main flow is one long sequential walk through every screen, so until it is
// split (the next slice), it covers everything: any change to src names it.
// When a scenario is added or split out, add its row here; `affected.test.ts`
// fails while a scenario the e2e can run alone is missing from this table.
// Globs: `**` any depth, `*` within one folder.

const SCENARIOS = [
  {
    name: 'tabs',
    covers: [
      'src/app/(tabs)/**',
      'src/app/_layout.tsx',
      'src/app/walk.tsx',
      'src/app/replay/**',
      'src/components/{RecordingBar,OpenWalk,HomeSheet,MomentBar,StartDialog}.tsx',
      'src/lib/{walkNav,walkGate,memoGate,recordingBar,startPlan,useStartWalk,launchRoute}.ts',
    ],
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
    name: 'qol',
    covers: [
      'src/components/{LocateButton,HomeSheet,CaptureView}.tsx',
      'src/components/map/**',
      'src/app/(tabs)/chronicle.tsx',
      'src/lib/{scaleBar,units,unitsStore,useUnits,useLocate,rename,noteEdit,months,pins,thumbPlan,thumbJob,walkTitle}.ts',
      'src/lib/nav/eta.ts',
    ],
  },
  {
    name: 'main',
    covers: ['src/**', 'index.js', 'public/**', 'app.json', 'app.config.js'],
  },
];

module.exports = { SCENARIOS };
