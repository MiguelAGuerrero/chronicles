// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Boundaries that used to be prose in AGENTS.md. Each message names the
// replacement, so a violation tells the reader what to do instead.
const restrictedPaths = [
  {
    name: 'react-native',
    importNames: ['Modal'],
    message:
      "Import Modal from 'components/Modal' (src/components/Modal.tsx). react-native-web's Modal leaks a portal per render under a hidden screen; the wrapper renders it only while visible.",
  },
  {
    name: 'react-native-reanimated',
    message:
      "Reanimated is not used (it added 140 KB gzipped to the web bundle). Use React Native's Animated with lib/motionTokens and lib/motion.",
  },
  {
    name: 'expo-audio',
    importNames: ['setAudioModeAsync'],
    message:
      "Call setAudioMode from 'lib/audioMode'. expo-audio's web setAudioModeAsync is empty, so the web needs its own implementation.",
  },
  {
    name: 'expo-haptics',
    message:
      "Haptics go through feedback(kind) in 'lib/motion' (built on lib/haptics), so reduce motion and the web no-op are honoured.",
  },
];
const restricted = { 'no-restricted-imports': ['error', { paths: restrictedPaths }] };

// The layers (FC1-FC5, .claude/rules/functional-core.md). Which files are core
// or view comes from each module's `// @layer` line, read by scripts/layers.js,
// the same reader `npm test` uses.
const layers = require('./scripts/layers');
const CORE = layers.filesOfLayer(__dirname, 'core');
const SHELLS = layers.filesOfLayer(__dirname, 'shell').filter((f) => !layers.COMPOSITION_ROOTS.includes(f));
const VIEWS = ['src/app/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}', ...layers.filesOfLayer(__dirname, 'view')];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'index.js'],
    rules: restricted,
  },
  // Core has no hidden inputs: no clock, randomness, timers or module state (FC3).
  { files: CORE, rules: layers.coreLintRules },
  // Views don't import the db, recorder, notifier or ports (FC5). Its own rule
  // id, apart from the paths above, so a suppressed count can't hide one of them.
  { files: VIEWS, rules: { [layers.FC5_RULE]: layers.viewSingletonRule } },
  // Shells take ports as an argument rather than importing the singletons (FR8); the
  // composition root that builds the ports is the exception.
  { files: SHELLS, rules: { [layers.FC5_RULE]: layers.shellSingletonRule } },
  // The wrappers the rules point at are the one place each import is allowed.
  { files: ['src/components/Modal.tsx'], rules: { 'no-restricted-imports': 'off' } },
  { files: ['src/lib/audioMode.native.ts'], rules: { 'no-restricted-imports': 'off' } },
  { files: ['src/lib/haptics.ts'], rules: { 'no-restricted-imports': 'off' } },
]);
