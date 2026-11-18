// @layer adapter
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

/*
 * The voice a turn is said in (RE25): the phone's own speech, through expo-speech (the browser's speech synthesis on the web).
 * `canSpeak` is false where there is none, and guiding then says its turns are shown, not said. One line at a time: a new turn
 * replaces one still being said.
 */
export const canSpeak: boolean = Platform.OS !== 'web' || (typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined');

export function sayTurn(text: string): void {
  if (!canSpeak) return;
  try {
    void Speech.stop().catch(() => {});
    Speech.speak(text);
  } catch {
    // No voice after all: the turn is still on the screen.
  }
}

export function hush(): void {
  if (canSpeak) void Speech.stop().catch(() => {});
}
