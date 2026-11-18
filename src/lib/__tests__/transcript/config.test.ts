import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const app = () => JSON.parse(readFileSync('app.json', 'utf8')).expo;

test('TX18: the speech and microphone strings are one plain sentence each, on the phone, with no urging or AI wording', () => {
  const plugin = (app().plugins as unknown[]).find((p) => Array.isArray(p) && p[0] === 'expo-speech-recognition') as [string, Record<string, string>] | undefined;
  assert.ok(plugin, 'expo-speech-recognition is a plugin');
  for (const k of ['speechRecognitionPermission', 'microphonePermission']) {
    const s: string = plugin![1][k];
    assert.ok(s, `${k} is set`);
    assert.equal(s.split(/[.!?]/).filter((x) => x.trim()).length, 1, `${k} is one sentence`);
    assert.doesNotMatch(s, /\bAI\b|artificial|smart|please|improve|server|cloud|send/i, `${k} is plain`);
  }
});

test('memo-transcripts audit 14: the speech plugin\'s microphone string names recording first, for iOS keeps one such string', () => {
  const plugins = app().plugins as unknown[];
  const speech = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-speech-recognition') as [string, Record<string, string>];
  const mic: string = speech[1].microphonePermission;
  assert.match(mic, /^Chronicles records voice notes/);
  assert.match(mic, /reads their words/);
});

test('memo-transcripts audit 4: setEdit asks for the memo to be read again when its edit changes', () => {
  const src = readFileSync('src/lib/useCaptures.ts', 'utf8');
  const body = src.slice(src.indexOf('async function setEdit'), src.indexOf('async function setEdit') + 900);
  assert.match(body, /'edit' in patch/);
  assert.match(body, /rereadTranscript\(/);
});
