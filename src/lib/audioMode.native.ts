import { setAudioModeAsync } from 'expo-audio';
import type { AudioMode } from './audioMode.types';

/** Sets the app's audio mode: on phones, expo-audio's own. */
export function setAudioMode(mode: AudioMode): Promise<void> {
  return setAudioModeAsync(mode);
}
