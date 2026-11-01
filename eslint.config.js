// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Functional core, imperative shell (AGENTS.md, "Code style"). Only the
// adapters and the composition root (`lib/ports`) reach the real db, recorder
// and notifier; shells take them as `Ports`; core is plain TypeScript.
// Type-only imports are always fine.
const REAL_PORTS = [
  { regex: '(^|/)db(/index(\\.(web|native))?)?$', message: 'Take the db from `Ports` (lib/ports) instead of importing it.' },
  { regex: '(^|/)recorder(/index(\\.(web|native))?)?$', message: 'Take the recorder from `Ports` (lib/ports) instead of importing it.' },
  { regex: '(^|/)notify(\\.(web|native))?$', message: 'Take the notifier from `Ports` (lib/ports) instead of importing it.' },
];
const COMPOSITION_ROOT = [
  { regex: '(^|/)ports(/index)?$', message: 'Shells and core take `Ports` as an argument; only hooks and screens import the real `ports`.' },
];
const PLATFORM = [
  { regex: '^(react|react-dom)(/|$)', message: 'Core and shells are plain TypeScript: keep React in hooks and components.' },
  { regex: '^react-native(/|$)', message: 'Core and shells are plain TypeScript: put platform code behind a port.' },
  { regex: '^@?expo(-|/|$)', message: 'Core and shells are plain TypeScript: put platform code behind a port.' },
  { regex: '^(maplibre-gl|@maplibre/)', message: 'Core and shells are plain TypeScript: map code stays in components/map.' },
];
const restrict = (patterns) => ({
  '@typescript-eslint/no-restricted-imports': ['error', { patterns: patterns.map((p) => ({ ...p, allowTypeImports: true })) }],
});

// Platform code, the composition root and tests: free to import anything.
const ADAPTERS = [
  'src/lib/db/**', 'src/lib/recorder/**', 'src/lib/notify*.ts', 'src/lib/media/**', 'src/lib/export/**',
  'src/lib/audioMode*.ts', 'src/lib/haptics.ts', 'src/lib/focus.ts', 'src/lib/ports/index.ts', 'src/lib/__tests__/**',
];
const HOOKS = ['src/lib/**/use*.ts'];

// Code written before these rules. The lists only shrink: when a file moves
// over to a shell, take it off. New files are never added.
const LEGACY_VIEW = [
  'src/app/index.tsx', 'src/app/walk.tsx', 'src/app/replay/[[]id].tsx', 'src/components/CaptureView.tsx',
];
const LEGACY_HOOKS = [
  'src/lib/useCaptures.ts', 'src/lib/useLiveTrace.ts', 'src/lib/discovery/useScan.ts', 'src/lib/nav/useNavigation.ts',
];
const LEGACY_LIB = [
  'src/lib/finish.ts', 'src/lib/here.ts', 'src/lib/session.ts',
  'src/lib/summary.ts', 'src/lib/tiles.ts', 'src/lib/discovery/ambientRun.ts', 'src/lib/discovery/recallCheck.ts',
  'src/lib/discovery/runScan.ts', 'src/lib/discovery/tileFetch.ts', 'src/lib/landing/read.ts', 'src/lib/nav/store.ts',
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Screens and components: reach data through a feature shell.
    files: ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
    ignores: LEGACY_VIEW,
    rules: restrict(REAL_PORTS),
  },
  {
    // Hooks: React glue that hands the real `ports` to a shell.
    files: HOOKS,
    ignores: [...ADAPTERS, ...LEGACY_HOOKS],
    rules: restrict(REAL_PORTS),
  },
  {
    // Core and shells: plain TypeScript, dependencies passed in.
    files: ['src/lib/**/*.ts'],
    ignores: [...ADAPTERS, ...HOOKS, ...LEGACY_LIB],
    rules: restrict([...REAL_PORTS, ...COMPOSITION_ROOT, ...PLATFORM]),
  },
]);
