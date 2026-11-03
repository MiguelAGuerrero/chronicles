// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

// Boundaries that used to be prose in AGENTS.md. Each message names the
// replacement, so a violation tells the reader what to do instead.
const restricted = {
  'no-restricted-imports': [
    'error',
    {
      paths: [
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
      ],
    },
  ],
};

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'index.js'],
    rules: restricted,
  },
  // The wrappers the rules point at are the one place each import is allowed.
  { files: ['src/components/Modal.tsx'], rules: { 'no-restricted-imports': 'off' } },
  { files: ['src/lib/audioMode.native.ts'], rules: { 'no-restricted-imports': 'off' } },
  { files: ['src/lib/haptics.ts'], rules: { 'no-restricted-imports': 'off' } },
]);
